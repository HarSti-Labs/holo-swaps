import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { prisma } from "@/config/prisma";
import { TradeStatus } from "@prisma/client";
import { recalculateTier } from "@/utils/tierUtils";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// POST /api/trades/:tradeId/reviews
export const submitReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await prisma.trade.findUnique({ where: { id: req.params.tradeId } });
  if (!trade) throw ApiError.notFound("Trade not found");

  if (trade.proposerId !== req.user!.id && trade.receiverId !== req.user!.id) {
    throw ApiError.forbidden();
  }

  if (trade.status !== TradeStatus.COMPLETED) {
    throw ApiError.badRequest("Reviews can only be submitted for completed trades");
  }

  const subjectId =
    trade.proposerId === req.user!.id ? trade.receiverId : trade.proposerId;

  const existing = await prisma.tradeReview.findUnique({
    where: {
      tradeId_authorId: { tradeId: req.params.tradeId, authorId: req.user!.id },
    },
  });
  if (existing) throw ApiError.conflict("You have already reviewed this trade");

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const review = await prisma.tradeReview.create({
    data: {
      tradeId: req.params.tradeId,
      authorId: req.user!.id,
      subjectId,
      ...parsed.data,
    },
    include: { author: { omit: { passwordHash: true } } },
  });

  // Recalculate reputation score for the reviewed user
  const aggResult = await prisma.tradeReview.aggregate({
    where: { subjectId },
    _avg: { rating: true },
  });
  const newReputationScore = aggResult._avg.rating ?? 0;
  const updatedSubject = await prisma.user.update({
    where: { id: subjectId },
    data: { reputationScore: newReputationScore },
    select: { tradeCount: true, reputationScore: true },
  });

  // Recalculate tier based on updated reputation score and trade count
  await prisma.user.update({
    where: { id: subjectId },
    data: { tier: recalculateTier(updatedSubject.tradeCount, updatedSubject.reputationScore) },
  });

  sendCreated(res, review, "Review submitted");
};
