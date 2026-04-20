import { prisma } from "@/config/prisma";
import { PricingService } from "@/services/implementations/PricingService";
import { logger } from "@/utils/logger";

const pricingService = new PricingService();
const BATCH_SIZE = 20;

export function startPriceSyncJob(): void {
  logger.info("Price sync job started");
  // Run once at startup, then every 6 hours
  syncPrices().catch((err) => logger.error("Price sync job error", { err }));
  setInterval(() => {
    syncPrices().catch((err) => logger.error("Price sync job error", { err }));
  }, 6 * 60 * 60 * 1000);
}

async function syncPrices(): Promise<void> {
  const cards = await prisma.card.findMany({
    where: { tcgplayerId: { not: null } },
    select: { id: true, tcgplayerId: true },
  });

  if (cards.length === 0) {
    logger.info("Price sync: no cards with tcgplayerId, skipping");
    return;
  }

  logger.info(`Price sync: syncing ${cards.length} cards`);

  let synced = 0;
  let failed = 0;

  // Process in batches to avoid hammering the TCGPlayer API
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (card) => {
        if (!card.tcgplayerId) return;

        const priceData = await pricingService.getCardPrice(card.tcgplayerId);
        if (!priceData) {
          failed++;
          return;
        }

        // Record price history
        await prisma.cardPriceHistory.create({
          data: {
            cardId: card.id,
            marketPrice: priceData.marketPrice,
            lowPrice: priceData.lowPrice,
            highPrice: priceData.highPrice,
          },
        });

        // Update cached market value on all collection items for this card
        await prisma.userCollection.updateMany({
          where: {
            cardId: card.id,
            askingValueOverride: null, // don't override user-set prices
          },
          data: {
            currentMarketValue: priceData.marketPrice,
            marketValueUpdatedAt: new Date(),
          },
        });

        synced++;
      })
    );

    // Small delay between batches to be a good API citizen
    if (i + BATCH_SIZE < cards.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  logger.info(`Price sync complete: ${synced} updated, ${failed} failed`);
}
