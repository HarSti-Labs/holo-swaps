import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { prisma } from "@/config/prisma";
// z is used by makeListingOfferSchema below
import { CardStatus, Prisma } from "@prisma/client";
import { TradeService } from "@/services/implementations/TradeService";

const tradeService = new TradeService();

const makeListingOfferSchema = z.object({
  offererCollectionItemIds: z.array(z.string().uuid()).min(1),
  proposerCashAdd: z.number().min(0).optional(),
  receiverCashAdd: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
});

// GET /api/listings
export const getListings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 24, 100);
  const skip = (page - 1) * limit;
  const game = req.query.game as string | undefined;
  const q = req.query.q as string | undefined;
  const rarity = req.query.rarity as string | undefined;
  const condition = req.query.condition as string | undefined;
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
  const foilOnly = req.query.foilOnly === "true";
  const sortBy = (req.query.sortBy as string) || "newest";

  // Build card-level filter (game + rarity + search)
  const cardWhere: Prisma.CardWhereInput = {};
  if (game) cardWhere.game = game as never;
  if (rarity) cardWhere.rarity = { equals: rarity, mode: "insensitive" };
  if (q) cardWhere.name = { contains: q, mode: "insensitive" };

  // Build price filter: effective price = askingValueOverride ?? currentMarketValue
  const priceRange: Prisma.FloatNullableFilter = {};
  if (minPrice !== undefined) priceRange.gte = minPrice;
  if (maxPrice !== undefined) priceRange.lte = maxPrice;
  const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;

  const where: Prisma.UserCollectionWhereInput = {
    status: CardStatus.AVAILABLE,
    media: { some: {} },
    ...(req.user && { userId: { not: req.user.id } }),
  };

  if (foilOnly) where.isFoil = true;
  if (condition) where.condition = condition as never;
  if (Object.keys(cardWhere).length > 0) where.card = cardWhere;
  if (hasPriceFilter) {
    where.OR = [
      { askingValueOverride: priceRange },
      { askingValueOverride: null, currentMarketValue: priceRange },
    ];
  }

  const orderBy =
    sortBy === "price_asc"
      ? [{ askingValueOverride: "asc" as const }, { currentMarketValue: "asc" as const }]
      : sortBy === "price_desc"
      ? [{ askingValueOverride: "desc" as const }, { currentMarketValue: "desc" as const }]
      : sortBy === "condition_best"
      ? [{ condition: "asc" as const }]
      : [{ updatedAt: "desc" as const }];

  const [data, total] = await prisma.$transaction([
    prisma.userCollection.findMany({
      where,
      include: {
        card: true,
        user: { select: { id: true, username: true, avatarUrl: true, reputationScore: true, tier: true } },
        media: { orderBy: { order: "asc" }, take: 3 },
      },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.userCollection.count({ where }),
  ]);

  sendSuccess(res, {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /api/listings/games
export const getListingGames = async (req: Request, res: Response): Promise<void> => {
  const items = await prisma.userCollection.findMany({
    where: { status: CardStatus.AVAILABLE, media: { some: {} } },
    select: { card: { select: { game: true } } },
    distinct: ["cardId"],
  });

  const games = [...new Set(items.map((i) => i.card.game))];
  sendSuccess(res, games);
};

// GET /api/listings/rarities
export const getListingRarities = async (req: Request, res: Response): Promise<void> => {
  const game = req.query.game as string | undefined;

  const cards = await prisma.card.findMany({
    where: {
      ...(game && { game: game as never }),
      rarity: { not: null },
      collectionItems: { some: { status: CardStatus.AVAILABLE, media: { some: {} } } },
    },
    select: { rarity: true },
    distinct: ["rarity"],
    orderBy: { rarity: "asc" },
  });

  sendSuccess(res, cards.map((c) => c.rarity).filter(Boolean));
};


// POST /api/listings/:itemId/offer
export const makeListingOffer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { itemId } = req.params;

  const listedItem = await prisma.userCollection.findUnique({
    where: { id: itemId },
    include: { user: { select: { id: true } } },
  });

  if (!listedItem) throw ApiError.notFound("Listing not found");
  if (listedItem.status !== CardStatus.AVAILABLE) {
    throw ApiError.badRequest("This card is no longer available");
  }
  if (listedItem.userId === req.user!.id) {
    throw ApiError.badRequest("You cannot make an offer on your own listing");
  }

  const parsed = makeListingOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.errors.map((e) => e.message));
  }

  const trade = await tradeService.proposeTrade({
    proposerId: req.user!.id,
    receiverId: listedItem.userId,
    proposerCollectionItemIds: parsed.data.offererCollectionItemIds,
    receiverCollectionItemIds: [itemId],
    proposerCashAdd: parsed.data.proposerCashAdd,
    receiverCashAdd: parsed.data.receiverCashAdd,
    message: parsed.data.message,
  });

  sendCreated(res, trade, "Offer submitted successfully");
};
