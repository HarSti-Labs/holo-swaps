import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { CollectionRepository } from "@/repositories/implementations/CollectionRepository";
import { PricingService } from "@/services/implementations/PricingService";
import { prisma } from "@/config/prisma";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { logger } from "@/utils/logger";
import { z } from "zod";
import { CardCondition, CardStatus, GradingCompany, MediaAngle } from "@prisma/client";
import { config } from "@/config";

const collectionRepo = new CollectionRepository();
const pricingService = new PricingService();

const addItemSchema = z.object({
  cardId: z.string().uuid(),
  condition: z.nativeEnum(CardCondition),
  isFoil: z.boolean().optional(),
  isFirstEdition: z.boolean().optional(),
  language: z.string().optional(),
  notes: z.string().max(500).optional(),
  status: z.nativeEnum(CardStatus).optional(),
  gradingCompany: z.nativeEnum(GradingCompany).optional(),
  gradingScore: z.number().positive().optional(),
  gradingCertNumber: z.string().optional(),
  askingValueOverride: z.number().positive().nullable().optional(),
  quantity: z.number().int().min(1).max(99).optional(),
});

const updateItemSchema = addItemSchema.partial().omit({ cardId: true });

// GET /api/collection  — own collection
export const getCollection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as CardStatus | undefined;

  const result = await collectionRepo.findByUserId(req.user!.id, {
    page,
    limit,
    status,
  });
  sendSuccess(res, result);
};

// GET /api/collection/:itemId
export const getCollectionItem = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const item = await collectionRepo.findById(req.params.itemId);
  if (!item) throw ApiError.notFound("Collection item not found");
  if (item.userId !== req.user!.id && !req.user!.isAdmin) throw ApiError.forbidden();

  sendSuccess(res, item);
};

// POST /api/collection
export const addToCollection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const { status, gradingCompany, gradingScore, gradingCertNumber, ...rest } = parsed.data;
  const item = await collectionRepo.create({
    userId: req.user!.id,
    ...rest,
    availableForTrade: status === CardStatus.AVAILABLE,
  });

  // Fire-and-forget: fetch market price immediately so listings show a value
  (async () => {
    try {
      const card = await prisma.card.findUnique({
        where: { id: parsed.data.cardId },
        select: { tcgapiDevId: true, tcgplayerId: true },
      });
      if (!card) return;

      const priceData = card.tcgapiDevId
        ? await pricingService.getCardPriceByDevId(card.tcgapiDevId)
        : card.tcgplayerId
        ? await pricingService.getCardPrice(card.tcgplayerId)
        : null;

      if (priceData) {
        await prisma.userCollection.update({
          where: { id: item.id },
          data: {
            currentMarketValue: priceData.marketPrice,
            marketValueUpdatedAt: new Date(),
          },
        });
      }
    } catch (err) {
      logger.error("Failed to fetch initial price for collection item", { itemId: item.id, err });
    }
  })();

  sendCreated(res, item, "Card added to collection");
};

// PATCH /api/collection/:itemId
export const updateCollectionItem = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const item = await collectionRepo.findById(req.params.itemId);
  if (!item) throw ApiError.notFound("Collection item not found");
  if (item.userId !== req.user!.id) throw ApiError.forbidden();

  if (item.status === CardStatus.IN_TRADE) {
    // Only allow quantity updates when in trade
    const allowedKeys = ["quantity"];
    const requestedKeys = Object.keys(req.body);
    const hasDisallowedKey = requestedKeys.some((k) => !allowedKeys.includes(k));
    if (hasDisallowedKey) {
      throw ApiError.badRequest("Cannot edit a card that is currently in a trade");
    }
  }

  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const { status, gradingCompany, gradingScore, gradingCertNumber, ...rest } = parsed.data;

  // Require at least one photo before a card can be marked AVAILABLE
  if (status === CardStatus.AVAILABLE) {
    const photoCount = await prisma.cardMedia.count({ where: { collectionItemId: item.id } });
    if (photoCount === 0) {
      throw ApiError.badRequest("Please upload at least one photo before marking this card as available for trade.");
    }
  }

  const updated = await collectionRepo.update(req.params.itemId, {
    ...rest,
    ...(status !== undefined && {
      availableForTrade: status !== CardStatus.UNAVAILABLE,
    }),
  });
  sendSuccess(res, updated, "Collection item updated");
};

// DELETE /api/collection/:itemId
export const removeFromCollection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const item = await collectionRepo.findById(req.params.itemId);
  if (!item) throw ApiError.notFound("Collection item not found");
  if (item.userId !== req.user!.id) throw ApiError.forbidden();

  if (item.status === CardStatus.IN_TRADE) {
    throw ApiError.badRequest("Cannot remove a card that is currently in a trade");
  }

  await collectionRepo.delete(req.params.itemId);
  sendSuccess(res, null, "Card removed from collection");
};

// POST /api/collection/:itemId/media
export const addCollectionMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const item = await collectionRepo.findById(req.params.itemId);
  if (!item) throw ApiError.notFound("Collection item not found");
  if (item.userId !== req.user!.id) throw ApiError.forbidden();

  const { url, angle = "FRONT" } = req.body;
  if (!url || typeof url !== "string") throw ApiError.badRequest("url is required");

  const validAngles = ["FRONT", "BACK", "DETAIL", "OVERVIEW"];
  if (!validAngles.includes(angle)) throw ApiError.badRequest("Invalid angle");

  const count = await prisma.cardMedia.count({ where: { collectionItemId: item.id } });
  if (count >= 5) throw ApiError.badRequest("Maximum 5 photos per card");

  const media = await prisma.cardMedia.create({
    data: {
      collectionItemId: item.id,
      type: "PHOTO",
      angle: angle as MediaAngle,
      url,
      order: count,
    },
  });

  sendCreated(res, media);
};

// DELETE /api/collection/:itemId/media/:mediaId
export const deleteCollectionMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const item = await collectionRepo.findById(req.params.itemId);
  if (!item) throw ApiError.notFound("Collection item not found");
  if (item.userId !== req.user!.id) throw ApiError.forbidden();

  const media = await prisma.cardMedia.findUnique({ where: { id: req.params.mediaId } });
  if (!media || media.collectionItemId !== item.id) throw ApiError.notFound("Media not found");

  // Best-effort delete from Supabase Storage
  try {
    const urlObj = new URL(media.url);
    const parts = urlObj.pathname.split("/card-media/");
    if (parts.length === 2) {
      await fetch(`${config.supabase.url}/storage/v1/object/card-media/${parts[1]}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${config.supabase.serviceKey}` },
      });
    }
  } catch (err) {
    logger.warn("Failed to delete media from storage", { mediaId: media.id, err });
  }

  await prisma.cardMedia.delete({ where: { id: req.params.mediaId } });
  sendSuccess(res, null, "Media deleted");
};

// GET /api/users/:userId/collection  — public collection (available cards only)
export const getPublicCollection = async (
  req: Request,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await collectionRepo.findByUserId(req.params.userId, {
    page,
    limit,
    status: CardStatus.AVAILABLE,
  });
  sendSuccess(res, result);
};
