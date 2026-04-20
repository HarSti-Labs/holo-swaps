import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { prisma } from "@/config/prisma";
import { CardGame } from "@prisma/client";
import { z } from "zod";

// GET /api/sets
// Lists all sets. If CardSet catalog records exist uses those; falls back to
// distinct setCode/setName values derived from the Card table.
export const getSets = async (req: Request, res: Response): Promise<void> => {
  const game = req.query.game as CardGame | undefined;

  // Try the catalog table first
  const catalogCount = await prisma.cardSet.count();

  if (catalogCount > 0) {
    const sets = await prisma.cardSet.findMany({
      where: { ...(game && { game }) },
      orderBy: [{ game: "asc" }, { releaseDate: "desc" }, { name: "asc" }],
    });
    sendSuccess(res, sets);
    return;
  }

  // Fallback: derive sets from Card table
  const sets = await prisma.card.groupBy({
    by: ["setCode", "setName", "game"],
    where: { ...(game && { game }) },
    _count: { id: true },
    orderBy: [{ game: "asc" }, { setName: "asc" }],
  });

  sendSuccess(
    res,
    sets.map((s) => ({
      setCode: s.setCode,
      name: s.setName,
      game: s.game,
      totalCards: s._count.id,
    }))
  );
};

// GET /api/sets/:setCode/cards
// Returns all cards in a set with pagination.
export const getSetCards = async (req: Request, res: Response): Promise<void> => {
  const { setCode } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.card.findMany({
      where: { setCode },
      skip,
      take: limit,
      orderBy: { cardNumber: "asc" },
    }),
    prisma.card.count({ where: { setCode } }),
  ]);

  if (total === 0) throw ApiError.notFound("Set not found");

  sendSuccess(res, {
    setCode,
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /api/sets/:setCode/completion   (authenticated)
// Returns how many cards in the set the user owns, and which ones they're missing.
export const getSetCompletion = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { setCode } = req.params;
  const userId = req.user!.id;

  const allCards = await prisma.card.findMany({
    where: { setCode },
    select: { id: true, name: true, cardNumber: true, rarity: true, imageUrl: true },
    orderBy: { cardNumber: "asc" },
  });

  if (allCards.length === 0) throw ApiError.notFound("Set not found");

  const ownedCardIds = new Set(
    (
      await prisma.userCollection.findMany({
        where: {
          userId,
          cardId: { in: allCards.map((c) => c.id) },
          status: { not: "TRADED_AWAY" },
        },
        select: { cardId: true },
      })
    ).map((item) => item.cardId)
  );

  const missing = allCards.filter((c) => !ownedCardIds.has(c.id));
  const have = allCards.filter((c) => ownedCardIds.has(c.id));

  sendSuccess(res, {
    setCode,
    total: allCards.length,
    have: have.length,
    missing: missing.length,
    completionPct: Math.round((have.length / allCards.length) * 100),
    missingCards: missing,
    ownedCards: have,
  });
};

// GET /api/collection/value   (authenticated)
// Returns the total estimated value of the authenticated user's collection.
export const getCollectionValue = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;

  const items = await prisma.userCollection.findMany({
    where: { userId, status: { not: "TRADED_AWAY" } },
    select: {
      id: true,
      status: true,
      askingValueOverride: true,
      currentMarketValue: true,
      card: { select: { id: true, name: true, setName: true } },
    },
  });

  let totalValue = 0;
  let valueableCount = 0;

  for (const item of items) {
    const value = item.askingValueOverride ?? item.currentMarketValue ?? 0;
    totalValue += value;
    if (value > 0) valueableCount++;
  }

  sendSuccess(res, {
    totalItems: items.length,
    itemsWithValue: valueableCount,
    estimatedValue: Math.round(totalValue * 100) / 100,
  });
};

const createSetSchema = z.object({
  game: z.nativeEnum(CardGame),
  setCode: z.string().min(1).max(20),
  name: z.string().min(1),
  releaseDate: z.string().optional(),
  totalCards: z.number().int().positive().optional(),
  logoUrl: z.string().url().optional(),
});

// POST /api/sets   (admin only)
export const createSet = async (req: Request, res: Response): Promise<void> => {
  const parsed = createSetSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.errors.map((e) => e.message));
  }

  const { game, setCode, name, releaseDate, totalCards, logoUrl } = parsed.data;

  const set = await prisma.cardSet.upsert({
    where: { setCode },
    create: {
      game,
      setCode,
      name,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      totalCards,
      logoUrl,
    },
    update: { game, name, releaseDate: releaseDate ? new Date(releaseDate) : undefined, totalCards, logoUrl },
  });

  sendSuccess(res, set);
};
