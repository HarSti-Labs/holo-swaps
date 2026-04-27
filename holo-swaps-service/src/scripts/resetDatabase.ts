/**
 * resetDatabase.ts
 *
 * Deletes all card catalog, trade, and collection data.
 * Keeps all User accounts, addresses, blocks, reports, refresh tokens.
 * Resets tradeCount, reputationScore, and tier on every user.
 *
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/resetDatabase.ts
 */

import { prisma } from "@/config/prisma";
import { logger } from "@/utils/logger";

async function resetDatabase() {
  logger.info("=== DATABASE RESET STARTING ===");
  logger.info("Users will be kept. Everything else will be deleted.");

  // ── Step 1: Show counts before deletion ──────────────────────────────────
  const [
    tradeSnapshotItemCount,
    tradeSnapshotCount,
    disputeEvidenceCount,
    disputeCount,
    cardMediaCount,
    cardVerificationCount,
    cardOwnershipCount,
    tradeReviewCount,
    tradeMessageCount,
    tradeOfferCount,
    tradeMatchItemCount,
    tradeMatchCount,
    shipmentCount,
    tradeItemCount,
    tradeCount,
    priceAlertCount,
    userWantCount,
    userCollectionCount,
    notificationCount,
    cardPriceHistoryCount,
    cardCount,
    cardSetCount,
  ] = await Promise.all([
    prisma.tradeSnapshotItem.count(),
    prisma.tradeSnapshot.count(),
    prisma.disputeEvidence.count(),
    prisma.dispute.count(),
    prisma.cardMedia.count(),
    prisma.cardVerification.count(),
    prisma.cardOwnershipHistory.count(),
    prisma.tradeReview.count(),
    prisma.tradeMessage.count(),
    prisma.tradeOffer.count(),
    prisma.tradeMatchItem.count(),
    prisma.tradeMatch.count(),
    prisma.shipment.count(),
    prisma.tradeItem.count(),
    prisma.trade.count(),
    prisma.priceAlert.count(),
    prisma.userWant.count(),
    prisma.userCollection.count(),
    prisma.notification.count(),
    prisma.cardPriceHistory.count(),
    prisma.card.count(),
    prisma.cardSet.count(),
  ]);

  logger.info("Records to be deleted:");
  logger.info(`  TradeSnapshotItems : ${tradeSnapshotItemCount}`);
  logger.info(`  TradeSnapshots     : ${tradeSnapshotCount}`);
  logger.info(`  DisputeEvidences   : ${disputeEvidenceCount}`);
  logger.info(`  Disputes           : ${disputeCount}`);
  logger.info(`  CardMedia          : ${cardMediaCount}`);
  logger.info(`  CardVerifications  : ${cardVerificationCount}`);
  logger.info(`  CardOwnershipHistory: ${cardOwnershipCount}`);
  logger.info(`  TradeReviews       : ${tradeReviewCount}`);
  logger.info(`  TradeMessages      : ${tradeMessageCount}`);
  logger.info(`  TradeOffers        : ${tradeOfferCount}`);
  logger.info(`  TradeMatchItems    : ${tradeMatchItemCount}`);
  logger.info(`  TradeMatches       : ${tradeMatchCount}`);
  logger.info(`  Shipments          : ${shipmentCount}`);
  logger.info(`  TradeItems         : ${tradeItemCount}`);
  logger.info(`  Trades             : ${tradeCount}`);
  logger.info(`  PriceAlerts        : ${priceAlertCount}`);
  logger.info(`  UserWants          : ${userWantCount}`);
  logger.info(`  UserCollections    : ${userCollectionCount}`);
  logger.info(`  Notifications      : ${notificationCount}`);
  logger.info(`  CardPriceHistory   : ${cardPriceHistoryCount}`);
  logger.info(`  Cards              : ${cardCount}`);
  logger.info(`  CardSets           : ${cardSetCount}`);

  const userCount = await prisma.user.count();
  logger.info(`Users to keep: ${userCount}`);
  logger.info("");
  logger.info("Starting deletions in FK-safe order...");

  // ── Step 2: Delete in FK-safe order ──────────────────────────────────────

  // TradeSnapshot children first
  await prisma.tradeSnapshotItem.deleteMany({});
  logger.info("Deleted TradeSnapshotItems");

  await prisma.tradeSnapshot.deleteMany({});
  logger.info("Deleted TradeSnapshots");

  // Dispute children first
  await prisma.disputeEvidence.deleteMany({});
  logger.info("Deleted DisputeEvidences");

  await prisma.dispute.deleteMany({});
  logger.info("Deleted Disputes");

  // Card media (attached to collection items and verifications)
  await prisma.cardMedia.deleteMany({});
  logger.info("Deleted CardMedia");

  await prisma.cardVerification.deleteMany({});
  logger.info("Deleted CardVerifications");

  await prisma.cardOwnershipHistory.deleteMany({});
  logger.info("Deleted CardOwnershipHistory");

  await prisma.tradeReview.deleteMany({});
  logger.info("Deleted TradeReviews");

  await prisma.tradeMessage.deleteMany({});
  logger.info("Deleted TradeMessages");

  await prisma.tradeOffer.deleteMany({});
  logger.info("Deleted TradeOffers");

  // TradeMatch children first
  await prisma.tradeMatchItem.deleteMany({});
  logger.info("Deleted TradeMatchItems");

  await prisma.tradeMatch.deleteMany({});
  logger.info("Deleted TradeMatches");

  await prisma.shipment.deleteMany({});
  logger.info("Deleted Shipments");

  await prisma.tradeItem.deleteMany({});
  logger.info("Deleted TradeItems");

  await prisma.trade.deleteMany({});
  logger.info("Deleted Trades");

  // Collection-dependent tables
  await prisma.priceAlert.deleteMany({});
  logger.info("Deleted PriceAlerts");

  await prisma.userWant.deleteMany({});
  logger.info("Deleted UserWants");

  await prisma.userCollection.deleteMany({});
  logger.info("Deleted UserCollections");

  // Notifications
  await prisma.notification.deleteMany({});
  logger.info("Deleted Notifications");

  // Card catalog
  await prisma.cardPriceHistory.deleteMany({});
  logger.info("Deleted CardPriceHistory");

  await prisma.card.deleteMany({});
  logger.info("Deleted Cards");

  await prisma.cardSet.deleteMany({});
  logger.info("Deleted CardSets");

  // ── Step 3: Reset user stats ──────────────────────────────────────────────
  const updated = await prisma.user.updateMany({
    data: {
      tradeCount: 0,
      reputationScore: 0,
      tier: "BRONZE",
    },
  });
  logger.info(`Reset tradeCount, reputationScore, tier on ${updated.count} users`);

  // ── Step 4: Verify ────────────────────────────────────────────────────────
  const remaining = await Promise.all([
    prisma.card.count(),
    prisma.trade.count(),
    prisma.userCollection.count(),
    prisma.user.count(),
  ]);

  logger.info("");
  logger.info("=== RESET COMPLETE ===");
  logger.info(`  Cards remaining        : ${remaining[0]}`);
  logger.info(`  Trades remaining       : ${remaining[1]}`);
  logger.info(`  Collections remaining  : ${remaining[2]}`);
  logger.info(`  Users kept             : ${remaining[3]}`);
}

resetDatabase()
  .then(() => {
    logger.info("Script finished successfully.");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Reset script failed", { error });
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
