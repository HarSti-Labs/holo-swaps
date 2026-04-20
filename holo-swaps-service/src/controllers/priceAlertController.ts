import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { prisma } from "@/config/prisma";
import { PriceAlertDirection } from "@prisma/client";

const createAlertSchema = z.object({
  cardId: z.string().uuid(),
  targetPrice: z.number().positive(),
  direction: z.nativeEnum(PriceAlertDirection),
});

// GET /api/price-alerts
export const getPriceAlerts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const includeTriggered = req.query.triggered === "true";

  const alerts = await prisma.priceAlert.findMany({
    where: {
      userId: req.user!.id,
      ...(!includeTriggered && { isTriggered: false }),
    },
    include: { card: true },
    orderBy: { createdAt: "desc" },
  });

  sendSuccess(res, alerts);
};

// POST /api/price-alerts
export const createPriceAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const card = await prisma.card.findUnique({ where: { id: parsed.data.cardId } });
  if (!card) throw ApiError.notFound("Card not found");

  const existing = await prisma.priceAlert.findUnique({
    where: {
      userId_cardId_direction: {
        userId: req.user!.id,
        cardId: parsed.data.cardId,
        direction: parsed.data.direction,
      },
    },
  });
  if (existing) {
    throw ApiError.conflict(
      "A price alert for this card and direction already exists"
    );
  }

  const alert = await prisma.priceAlert.create({
    data: { userId: req.user!.id, ...parsed.data },
    include: { card: true },
  });

  sendCreated(res, alert, "Price alert created");
};

// DELETE /api/price-alerts/:alertId
export const deletePriceAlert = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const alert = await prisma.priceAlert.findUnique({
    where: { id: req.params.alertId },
  });
  if (!alert) throw ApiError.notFound("Price alert not found");
  if (alert.userId !== req.user!.id) throw ApiError.forbidden();

  await prisma.priceAlert.delete({ where: { id: req.params.alertId } });
  sendSuccess(res, null, "Price alert deleted");
};
