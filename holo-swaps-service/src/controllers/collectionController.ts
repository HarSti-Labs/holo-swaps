import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { CollectionRepository } from "@/repositories/implementations/CollectionRepository";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { CardCondition, CardStatus, GradingCompany } from "@prisma/client";

const collectionRepo = new CollectionRepository();

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
  askingValueOverride: z.number().positive().optional(),
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
    availableForTrade: status !== CardStatus.UNAVAILABLE,
  });

  // Apply extra fields Prisma supports directly
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
    throw ApiError.badRequest("Cannot edit a card that is currently in a trade");
  }

  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const { status, gradingCompany, gradingScore, gradingCertNumber, ...rest } = parsed.data;
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
