import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { prisma } from "@/config/prisma";
import { CardStatus } from "@prisma/client";
import { TradeService } from "@/services/implementations/TradeService";

const tradeService = new TradeService();

const toggleListingSchema = z.object({
  list: z.boolean(),
  description: z.string().max(1000).optional(),
});

const makeListingOfferSchema = z.object({
  offererCollectionItemIds: z.array(z.string().uuid()).min(1),
  proposerCashAdd: z.number().min(0).optional(),
  receiverCashAdd: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
});

// GET /api/listings
export const getListings = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;
  const game = req.query.game as string | undefined;
  const q = req.query.q as string | undefined;

  const where = {
    isOpenListing: true,
    status: CardStatus.AVAILABLE,
    ...(game && { card: { game: game as never } }),
    ...(q && { card: { name: { contains: q, mode: "insensitive" as const } } }),
  };

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
      orderBy: { updatedAt: "desc" },
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

// PATCH /api/collection/:itemId/listing
export const toggleListing = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const item = await prisma.userCollection.findUnique({
    where: { id: req.params.itemId },
  });

  if (!item) throw ApiError.notFound("Collection item not found");
  if (item.userId !== req.user!.id) throw ApiError.forbidden();
  if (item.status === CardStatus.IN_TRADE) {
    throw ApiError.badRequest("Cannot toggle listing for a card that is currently in a trade");
  }

  const parsed = toggleListingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.errors.map((e) => e.message));
  }

  const updated = await prisma.userCollection.update({
    where: { id: req.params.itemId },
    data: {
      isOpenListing: parsed.data.list,
      listingDescription: parsed.data.description ?? item.listingDescription,
    },
  });

  sendSuccess(
    res,
    updated,
    parsed.data.list ? "Card listed as open to offers" : "Card removed from open listings"
  );
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
  if (!listedItem.isOpenListing) throw ApiError.badRequest("This card is not open for offers");
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
