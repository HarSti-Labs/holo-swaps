import { TradeStatus, CardStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/config/prisma";
import { logger } from "@/utils/logger";

const TRADE_TTL_DAYS = 7;
const WARNING_HOURS_BEFORE = 24;
// How often the job runs (ms). Must be ≤ WARNING_HOURS_BEFORE to guarantee a single warning.
const JOB_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const EXPIRABLE_STATUSES = [TradeStatus.PROPOSED, TradeStatus.COUNTERED];

// ─── Send 24-hour expiry warnings ────────────────────────────────────────────

async function sendExpiryWarnings(): Promise<void> {
  const now = new Date();
  // Warning window: expires within the next job interval + small buffer to catch edge cases
  const windowStart = new Date(now.getTime() + (WARNING_HOURS_BEFORE - 1) * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + WARNING_HOURS_BEFORE * 60 * 60 * 1000);

  const trades = await prisma.trade.findMany({
    where: {
      status: { in: EXPIRABLE_STATUSES },
      expiresAt: { gte: windowStart, lte: windowEnd },
    },
    select: {
      id: true,
      tradeCode: true,
      proposerId: true,
      receiverId: true,
      expiresAt: true,
    },
  });

  if (trades.length === 0) return;

  // De-duplicate: skip trades that already have a warning notification
  const alreadyWarned = await prisma.notification.findMany({
    where: {
      type: NotificationType.TRADE_EXPIRY_WARNING,
      data: { path: ["tradeId"], in: trades.map((t) => t.id) },
    },
    select: { data: true },
  });

  const warnedTradeIds = new Set(
    alreadyWarned
      .map((n) => (n.data as { tradeId?: string })?.tradeId)
      .filter(Boolean) as string[]
  );

  const unwarnedTrades = trades.filter((t) => !warnedTradeIds.has(t.id));
  if (unwarnedTrades.length === 0) return;

  const notifications = unwarnedTrades.flatMap((trade) => [
    {
      userId: trade.proposerId,
      type: NotificationType.TRADE_EXPIRY_WARNING,
      title: "Trade expiring soon",
      body: `Trade ${trade.tradeCode} will expire in 24 hours. Make sure both sides confirm to keep it alive.`,
      data: { tradeId: trade.id, tradeCode: trade.tradeCode },
    },
    {
      userId: trade.receiverId,
      type: NotificationType.TRADE_EXPIRY_WARNING,
      title: "Trade expiring soon",
      body: `Trade ${trade.tradeCode} will expire in 24 hours. Make sure both sides confirm to keep it alive.`,
      data: { tradeId: trade.id, tradeCode: trade.tradeCode },
    },
  ]);

  await prisma.notification.createMany({ data: notifications });
  logger.info(`[tradeExpiryJob] Sent expiry warnings for ${unwarnedTrades.length} trade(s)`);
}

// ─── Auto-cancel expired trades ──────────────────────────────────────────────

async function cancelExpiredTrades(): Promise<void> {
  const now = new Date();

  const expiredTrades = await prisma.trade.findMany({
    where: {
      status: { in: EXPIRABLE_STATUSES },
      expiresAt: { lt: now },
    },
    select: {
      id: true,
      tradeCode: true,
      proposerId: true,
      receiverId: true,
      stripePaymentIntentId: true,
    },
  });

  if (expiredTrades.length === 0) return;

  for (const trade of expiredTrades) {
    try {
      // Gather all locked collection item IDs for this trade
      const tradeItems = await prisma.tradeItem.findMany({
        where: { tradeId: trade.id },
        select: { collectionItemId: true },
      });
      const collectionItemIds = tradeItems.map((i) => i.collectionItemId);

      await prisma.$transaction([
        // Cancel the trade
        prisma.trade.update({
          where: { id: trade.id },
          data: { status: TradeStatus.CANCELLED },
        }),
        // Unlock all cards
        prisma.userCollection.updateMany({
          where: { id: { in: collectionItemIds } },
          data: { status: CardStatus.AVAILABLE, lockedByTradeId: null },
        }),
        // Notify both parties
        prisma.notification.createMany({
          data: [
            {
              userId: trade.proposerId,
              type: NotificationType.TRADE_CANCELLED,
              title: "Trade expired",
              body: `Trade ${trade.tradeCode} has been automatically cancelled because it was not accepted within ${TRADE_TTL_DAYS} days.`,
              data: { tradeId: trade.id, tradeCode: trade.tradeCode },
            },
            {
              userId: trade.receiverId,
              type: NotificationType.TRADE_CANCELLED,
              title: "Trade expired",
              body: `Trade ${trade.tradeCode} has been automatically cancelled because it was not accepted within ${TRADE_TTL_DAYS} days.`,
              data: { tradeId: trade.id, tradeCode: trade.tradeCode },
            },
          ],
        }),
      ]);

      logger.info(`[tradeExpiryJob] Auto-cancelled expired trade ${trade.tradeCode}`);
    } catch (err) {
      logger.error(`[tradeExpiryJob] Failed to cancel trade ${trade.tradeCode}`, { err });
    }
  }
}

// ─── Job runner ──────────────────────────────────────────────────────────────

async function runTradeExpiryJob(): Promise<void> {
  try {
    await sendExpiryWarnings();
    await cancelExpiredTrades();
  } catch (err) {
    logger.error("[tradeExpiryJob] Unhandled error", { err });
  }
}

export function startTradeExpiryJob(): void {
  // Run immediately on startup to catch any backlog, then on interval
  runTradeExpiryJob();
  setInterval(runTradeExpiryJob, JOB_INTERVAL_MS);
  logger.info(
    `[tradeExpiryJob] Started — checking every ${JOB_INTERVAL_MS / 60_000} minutes, TTL = ${TRADE_TTL_DAYS} days`
  );
}
