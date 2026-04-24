import { Request, Response } from "express";
import { sendSuccess } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { CardGame, CardStatus } from "@prisma/client";
import { prisma } from "@/config/prisma";
import { z } from "zod";

// GET /api/cards/most-wanted
export const getMostWanted = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const game = req.query.game as CardGame | undefined;

  const grouped = await prisma.userWant.groupBy({
    by: ["cardId"],
    where: {
      isFulfilled: false,
      ...(game && { card: { game } }),
    },
    _count: { cardId: true },
    orderBy: { _count: { cardId: "desc" } },
    take: limit,
  });

  const cardIds = grouped.map((g) => g.cardId);
  const cards = await prisma.card.findMany({ where: { id: { in: cardIds } } });
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  const result = grouped.map((g) => ({
    card: cardMap.get(g.cardId),
    wantCount: g._count.cardId,
  }));

  sendSuccess(res, result);
};

const searchSchema = z.object({
  q: z.string().optional(),
  game: z.nativeEnum(CardGame).optional(),
  setCode: z.string().optional(),
  setName: z.string().optional(),
  rarity: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// GET /api/cards
export const searchCards = async (req: Request, res: Response): Promise<void> => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid query parameters");
  }

  const { q, game, setCode, setName, rarity, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
    ...(game && { game }),
    ...(setCode && { setCode }),
    ...(setName && { setName: { contains: setName, mode: "insensitive" as const } }),
    ...(rarity && { rarity: { equals: rarity, mode: "insensitive" as const } }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.card.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.card.count({ where }),
  ]);

  sendSuccess(res, {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /api/cards/:cardId
export const getCardById = async (req: Request, res: Response): Promise<void> => {
  const card = await prisma.card.findUnique({
    where: { id: req.params.cardId },
    include: {
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 30,
      },
    },
  });
  if (!card) throw ApiError.notFound("Card not found");
  sendSuccess(res, card);
};

// GET /api/cards/:cardId/holders
// Returns all users who have this card AVAILABLE, with their collection item details.
// Supports filtering by condition, grading company, and min/max asking price.
export const getCardHolders = async (req: Request, res: Response): Promise<void> => {
  const card = await prisma.card.findUnique({ where: { id: req.params.cardId } });
  if (!card) throw ApiError.notFound("Card not found");

  const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const skip  = (page - 1) * limit;

  const { condition, gradingCompany, minPrice, maxPrice } = req.query;

  const where = {
    cardId: card.id,
    status: CardStatus.AVAILABLE,
    isOpenListing: undefined as boolean | undefined,
    // Respect collection visibility — only return items from PUBLIC collections
    user: {
      isBanned: false,
      collectionVisibility: "PUBLIC" as const,
    },
    ...(condition && { condition: condition as never }),
    ...(gradingCompany && { gradingCompany: gradingCompany as never }),
    ...((minPrice || maxPrice) && {
      OR: [
        {
          askingValueOverride: {
            ...(minPrice && { gte: parseFloat(minPrice as string) }),
            ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
          },
        },
        {
          currentMarketValue: {
            ...(minPrice && { gte: parseFloat(minPrice as string) }),
            ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
          },
        },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.userCollection.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            reputationScore: true,
            tier: true,
            tradeCount: true,
          },
        },
        media: { orderBy: { order: "asc" }, take: 1 }, // front photo only for list view
      },
      skip,
      take: limit,
      orderBy: [
        // Prioritise open listings first, then sort by price ascending
        { isOpenListing: "desc" },
        { askingValueOverride: "asc" },
        { currentMarketValue: "asc" },
      ],
    }),
    prisma.userCollection.count({ where }),
  ]);

  sendSuccess(res, {
    card,
    data: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /api/cards/sets - Get all distinct set names from cards
export const getCardSets = async (req: Request, res: Response): Promise<void> => {
  const rows = await prisma.card.findMany({
    select: { setName: true },
    distinct: ["setName"],
    orderBy: { setName: "asc" },
  });
  sendSuccess(res, rows.map((r) => r.setName));
};

// GET /api/cards/rarities?setCode=XXX
export const getRarities = async (req: Request, res: Response): Promise<void> => {
  const { setCode } = req.query;
  const where = setCode ? { setCode: setCode as string, rarity: { not: null } } : { rarity: { not: null } };
  const rows = await prisma.card.findMany({
    where,
    select: { rarity: true },
    distinct: ["rarity"],
    orderBy: { rarity: "asc" },
  });
  const rarities = rows.map((r) => r.rarity).filter(Boolean) as string[];
  sendSuccess(res, rarities);
};

// GET /api/cards/:cardId/price
export const getCardPrice = async (req: Request, res: Response): Promise<void> => {
  const card = await prisma.card.findUnique({
    where: { id: req.params.cardId },
    include: {
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!card) throw ApiError.notFound("Card not found");

  const latest = card.priceHistory[0] ?? null;
  sendSuccess(res, {
    cardId: card.id,
    name: card.name,
    tcgplayerId: card.tcgplayerId,
    latestPrice: latest,
  });
};
