import { prisma } from "@/config/prisma";
import { CardStatus, TradeMatchStatus, NotificationType } from "@prisma/client";
import { logger } from "@/utils/logger";

export function startMatchJob(): void {
  logger.info("Trade match job started");
  // Run immediately on startup, then every 4 hours
  runMatchCycle().catch((err) => logger.error("Match job error", { err }));
  setInterval(() => {
    runMatchCycle().catch((err) => logger.error("Match job error", { err }));
  }, 4 * 60 * 60 * 1000);
}

async function runMatchCycle(): Promise<void> {
  await expireStaleMatches();
  await scanAndPersistMatches();
}

async function expireStaleMatches(): Promise<void> {
  const pending = await prisma.tradeMatch.findMany({
    where: { status: TradeMatchStatus.PENDING },
    include: {
      items: {
        include: {
          collectionItem: { select: { status: true } },
          want: { select: { isFulfilled: true } },
        },
      },
    },
  });

  const toExpire = pending
    .filter((m) =>
      m.items.some(
        (i) =>
          i.collectionItem.status !== CardStatus.AVAILABLE || i.want.isFulfilled
      )
    )
    .map((m) => m.id);

  if (toExpire.length > 0) {
    await prisma.tradeMatch.updateMany({
      where: { id: { in: toExpire } },
      data: { status: TradeMatchStatus.EXPIRED },
    });
    logger.info(`Expired ${toExpire.length} stale trade matches`);
  }
}

async function scanAndPersistMatches(): Promise<void> {
  // Load all unfulfilled wants and available collection items into memory
  const [allWants, availableItems] = await Promise.all([
    prisma.userWant.findMany({
      where: { isFulfilled: false, user: { isBanned: false } },
      select: { id: true, userId: true, cardId: true },
    }),
    prisma.userCollection.findMany({
      where: { status: CardStatus.AVAILABLE, user: { isBanned: false } },
      select: { id: true, userId: true, cardId: true, currentMarketValue: true },
    }),
  ]);

  // Build lookup maps
  const wantsByUser = new Map<string, Array<{ id: string; cardId: string }>>();
  const wantersByCard = new Map<string, string[]>();
  for (const w of allWants) {
    if (!wantsByUser.has(w.userId)) wantsByUser.set(w.userId, []);
    wantsByUser.get(w.userId)!.push({ id: w.id, cardId: w.cardId });
    if (!wantersByCard.has(w.cardId)) wantersByCard.set(w.cardId, []);
    wantersByCard.get(w.cardId)!.push(w.userId);
  }

  const collectionByUser = new Map<string, Array<{ id: string; cardId: string; value: number }>>();
  const holdersByCard = new Map<string, string[]>();
  for (const item of availableItems) {
    if (!collectionByUser.has(item.userId)) collectionByUser.set(item.userId, []);
    collectionByUser.get(item.userId)!.push({
      id: item.id,
      cardId: item.cardId,
      value: item.currentMarketValue ?? 0,
    });
    if (!holdersByCard.has(item.cardId)) holdersByCard.set(item.cardId, []);
    holdersByCard.get(item.cardId)!.push(item.userId);
  }

  // Identify mutual pairs
  const mutualPairs = new Set<string>();

  for (const [cardId, wanters] of wantersByCard) {
    const holders = holdersByCard.get(cardId) ?? [];
    for (const wanter of wanters) {
      for (const holder of holders) {
        if (wanter === holder) continue;
        // Check reverse: does holder want something wanter has?
        const holderWants = wantsByUser.get(holder);
        const wanterCollection = collectionByUser.get(wanter);
        if (!holderWants || !wanterCollection) continue;
        const wanterCardIds = new Set(wanterCollection.map((c) => c.cardId));
        const hasReverse = holderWants.some((w) => wanterCardIds.has(w.cardId));
        if (hasReverse) {
          const [a, b] = wanter < holder ? [wanter, holder] : [holder, wanter];
          mutualPairs.add(`${a}|${b}`);
        }
      }
    }
  }

  logger.info(`Match job found ${mutualPairs.size} mutual pairs`);

  let created = 0;
  for (const pair of mutualPairs) {
    const [userAId, userBId] = pair.split("|");

    // Skip if a non-expired match already exists
    const existing = await prisma.tradeMatch.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (existing && existing.status !== TradeMatchStatus.EXPIRED) continue;

    // Build match items
    const aCollection = collectionByUser.get(userAId) ?? [];
    const bCollection = collectionByUser.get(userBId) ?? [];
    const aWants = wantsByUser.get(userAId) ?? [];
    const bWants = wantsByUser.get(userBId) ?? [];

    const aCardIds = new Set(aCollection.map((c) => c.cardId));
    const bCardIds = new Set(bCollection.map((c) => c.cardId));

    const matchItems: { wantId: string; collectionItemId: string }[] = [];

    // A wants something B has
    for (const want of aWants) {
      if (bCardIds.has(want.cardId)) {
        const item = bCollection.find((c) => c.cardId === want.cardId);
        if (item) matchItems.push({ wantId: want.id, collectionItemId: item.id });
      }
    }
    // B wants something A has
    for (const want of bWants) {
      if (aCardIds.has(want.cardId)) {
        const item = aCollection.find((c) => c.cardId === want.cardId);
        if (item) matchItems.push({ wantId: want.id, collectionItemId: item.id });
      }
    }

    if (matchItems.length === 0) continue;

    // Score: item count * value alignment (1 = perfect, lower = worse)
    const aValue = aWants
      .filter((w) => bCardIds.has(w.cardId))
      .reduce((s, w) => s + (bCollection.find((c) => c.cardId === w.cardId)?.value ?? 0), 0);
    const bValue = bWants
      .filter((w) => aCardIds.has(w.cardId))
      .reduce((s, w) => s + (aCollection.find((c) => c.cardId === w.cardId)?.value ?? 0), 0);
    const maxVal = Math.max(aValue, bValue, 1);
    const matchScore =
      matchItems.length * (1 - Math.abs(aValue - bValue) / maxVal);

    const tradeMatch = await prisma.tradeMatch.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: {
        userAId,
        userBId,
        matchScore,
        status: TradeMatchStatus.PENDING,
        items: { create: matchItems },
      },
      update: {
        matchScore,
        status: TradeMatchStatus.PENDING,
        items: { deleteMany: {}, create: matchItems },
      },
    });

    created++;

    // Notify both users (at most once per 24h per match)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [notifyUserId, matchedUserId] of [
      [userAId, userBId],
      [userBId, userAId],
    ]) {
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          userId: notifyUserId,
          type: NotificationType.TRADE_MATCH,
          createdAt: { gte: oneDayAgo },
        },
      });
      if (!alreadyNotified) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: NotificationType.TRADE_MATCH,
            title: "New Trade Match!",
            body: "We found someone whose collection matches your want list.",
            data: { matchId: tradeMatch.id, matchedUserId },
          },
        });
      }
    }
  }

  logger.info(`Match job: ${created} new/refreshed matches`);
}
