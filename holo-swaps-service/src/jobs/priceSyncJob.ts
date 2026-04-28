import { prisma } from "@/config/prisma";
import { PricingService } from "@/services/implementations/PricingService";
import { logger } from "@/utils/logger";

const pricingService = new PricingService();

// Starter plan: 2,500 req/day.
// Cap at 2,000 to leave 500 for on-demand lookups during the day.
const DAILY_SYNC_CAP = 2000;
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 200;

// Only re-fetch a card's price if it hasn't been updated in this many days.
// With 2,500 credits/day and a 3-day threshold, we effectively cover ~7,500 unique cards.
const PRICE_STALE_DAYS = 3;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startPriceSyncJob(): void {
  logger.info("Price sync job started (runs once per day)");
  syncPrices().catch((err) => logger.error("Price sync job error", { err }));
  setInterval(() => {
    syncPrices().catch((err) => logger.error("Price sync job error", { err }));
  }, ONE_DAY_MS);
}

async function syncPrices(): Promise<void> {
  const staleThreshold = new Date(Date.now() - PRICE_STALE_DAYS * 24 * 60 * 60 * 1000);

  // Find distinct card IDs in active collections whose price is stale or never fetched.
  // Prioritise never-fetched (null) first, then oldest update.
  const staleItems = await prisma.userCollection.findMany({
    where: {
      status: { not: "TRADED_AWAY" },
      OR: [
        { marketValueUpdatedAt: null },
        { marketValueUpdatedAt: { lt: staleThreshold } },
      ],
    },
    select: { cardId: true, marketValueUpdatedAt: true },
    distinct: ["cardId"],
    orderBy: { marketValueUpdatedAt: "asc" }, // nulls first, then oldest
    take: DAILY_SYNC_CAP,
  });

  if (staleItems.length === 0) {
    logger.info("Price sync: all active collection prices are fresh, skipping");
    return;
  }

  const cardIds = staleItems.map((r) => r.cardId);

  const cards = await prisma.card.findMany({
    where: {
      id: { in: cardIds },
      OR: [{ tcgapiDevId: { not: null } }, { tcgplayerId: { not: null } }],
    },
    select: { id: true, tcgapiDevId: true, tcgplayerId: true },
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
          where: { cardId: card.id },
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
