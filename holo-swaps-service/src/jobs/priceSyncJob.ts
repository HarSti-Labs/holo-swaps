import { prisma } from "@/config/prisma";
import { PricingService } from "@/services/implementations/PricingService";
import { logger } from "@/utils/logger";

const pricingService = new PricingService();

// Stay well under the free-tier daily limit (100 req/day).
// Each card with a tcgapiDevId costs 1 request; without it costs 2.
// We cap at 80 cards to leave headroom for on-demand lookups.
const DAILY_SYNC_CAP = 80;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startPriceSyncJob(): void {
  logger.info("Price sync job started (runs once per day)");
  syncPrices().catch((err) => logger.error("Price sync job error", { err }));
  setInterval(() => {
    syncPrices().catch((err) => logger.error("Price sync job error", { err }));
  }, ONE_DAY_MS);
}

async function syncPrices(): Promise<void> {
  // Only sync cards that are actually in someone's active collection —
  // no point fetching prices for catalog cards nobody owns.
  const activeCardIds = await prisma.userCollection.findMany({
    where: { status: { not: "TRADED_AWAY" } },
    select: { cardId: true },
    distinct: ["cardId"],
  });

  if (activeCardIds.length === 0) {
    logger.info("Price sync: no cards in active collections, skipping");
    return;
  }

  const cardIds = activeCardIds.map((r) => r.cardId);

  // Fetch card rows — prefer those with tcgapiDevId already populated
  // (1 API call each) and sort by oldest price update first.
  const cards = await prisma.card.findMany({
    where: {
      id: { in: cardIds },
      OR: [{ tcgapiDevId: { not: null } }, { tcgplayerId: { not: null } }],
    },
    select: { id: true, tcgapiDevId: true, tcgplayerId: true },
    orderBy: { updatedAt: "asc" },
    take: DAILY_SYNC_CAP,
  });

  if (cards.length === 0) {
    logger.info("Price sync: no eligible cards found, skipping");
    return;
  }

  logger.info(`Price sync: syncing ${cards.length} cards (cap: ${DAILY_SYNC_CAP})`);

  let synced = 0;
  let failed = 0;

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (card) => {
        const priceData = card.tcgapiDevId
          ? await pricingService.getCardPriceByDevId(card.tcgapiDevId)
          : card.tcgplayerId
          ? await pricingService.getCardPrice(card.tcgplayerId)
          : null;

        if (!priceData) {
          failed++;
          return;
        }

        await prisma.cardPriceHistory.create({
          data: {
            cardId: card.id,
            marketPrice: priceData.marketPrice,
            lowPrice: priceData.lowPrice,
            highPrice: priceData.highPrice,
          },
        });

        await prisma.userCollection.updateMany({
          where: {
            cardId: card.id,
            askingValueOverride: null,
          },
          data: {
            currentMarketValue: priceData.marketPrice,
            marketValueUpdatedAt: new Date(),
          },
        });

        synced++;
      })
    );

    if (i + BATCH_SIZE < cards.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  logger.info(`Price sync complete: ${synced} updated, ${failed} failed`);
}
