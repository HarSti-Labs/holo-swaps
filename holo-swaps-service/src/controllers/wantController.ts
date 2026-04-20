import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { CardCondition, GradingCompany, WantPriority } from "@prisma/client";
import { prisma } from "@/config/prisma";

const addWantSchema = z.object({
  cardId: z.string().uuid(),
  maxCondition: z.nativeEnum(CardCondition).optional(),
  priority: z.nativeEnum(WantPriority).optional(),
  preferredGradingCompany: z.nativeEnum(GradingCompany).optional(),
  minGradingScore: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

const updateWantSchema = addWantSchema.partial().omit({ cardId: true });

// GET /api/wants
export const getWants = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const includeFulfilled = req.query.fulfilled === "true";

  const wants = await prisma.userWant.findMany({
    where: {
      userId: req.user!.id,
      ...(!includeFulfilled && { isFulfilled: false }),
    },
    include: { card: true },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  sendSuccess(res, wants);
};

// POST /api/wants
export const addWant = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = addWantSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const card = await prisma.card.findUnique({ where: { id: parsed.data.cardId } });
  if (!card) throw ApiError.notFound("Card not found");

  const existing = await prisma.userWant.findUnique({
    where: {
      userId_cardId: { userId: req.user!.id, cardId: parsed.data.cardId },
    },
  });
  if (existing) throw ApiError.conflict("Card is already on your want list");

  const want = await prisma.userWant.create({
    data: { userId: req.user!.id, ...parsed.data },
    include: { card: true },
  });

  sendCreated(res, want, "Card added to want list");
};

// PATCH /api/wants/:wantId
export const updateWant = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const want = await prisma.userWant.findUnique({
    where: { id: req.params.wantId },
  });
  if (!want) throw ApiError.notFound("Want not found");
  if (want.userId !== req.user!.id) throw ApiError.forbidden();

  const parsed = updateWantSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const updated = await prisma.userWant.update({
    where: { id: req.params.wantId },
    data: parsed.data,
    include: { card: true },
  });

  sendSuccess(res, updated, "Want updated");
};

// DELETE /api/wants/:wantId
export const removeWant = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const want = await prisma.userWant.findUnique({
    where: { id: req.params.wantId },
  });
  if (!want) throw ApiError.notFound("Want not found");
  if (want.userId !== req.user!.id) throw ApiError.forbidden();

  await prisma.userWant.delete({ where: { id: req.params.wantId } });
  sendSuccess(res, null, "Card removed from want list");
};
