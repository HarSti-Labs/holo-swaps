import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { prisma } from "@/config/prisma";
import { selectSafeUser } from "@/repositories/implementations/UserRepository";
import { EmailService } from "@/services/implementations/EmailService";
import { config } from "@/config";

const emailService = new EmailService();

const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

// GET /api/trades/:tradeId/messages
export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await prisma.trade.findUnique({ where: { id: req.params.tradeId } });
  if (!trade) throw ApiError.notFound("Trade not found");

  if (trade.proposerId !== req.user!.id && trade.receiverId !== req.user!.id) {
    throw ApiError.forbidden();
  }

  const messages = await prisma.tradeMessage.findMany({
    where: { tradeId: req.params.tradeId },
    include: { sender: { select: selectSafeUser } },
    orderBy: { createdAt: "asc" },
  });

  // Mark messages from the other party as read
  await prisma.tradeMessage.updateMany({
    where: {
      tradeId: req.params.tradeId,
      senderId: { not: req.user!.id },
      isRead: false,
    },
    data: { isRead: true },
  });

  sendSuccess(res, messages);
};

// POST /api/trades/:tradeId/messages
export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await prisma.trade.findUnique({ where: { id: req.params.tradeId } });
  if (!trade) throw ApiError.notFound("Trade not found");

  if (trade.proposerId !== req.user!.id && trade.receiverId !== req.user!.id) {
    throw ApiError.forbidden();
  }

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const message = await prisma.tradeMessage.create({
    data: {
      tradeId: req.params.tradeId,
      senderId: req.user!.id,
      body: parsed.data.body,
    },
    include: { sender: { select: selectSafeUser } },
  });

  // Fire-and-forget: notify the other party
  const recipientId = trade.proposerId === req.user!.id ? trade.receiverId : trade.proposerId;
  prisma.user.findUnique({ where: { id: recipientId }, select: { email: true, username: true, emailOnTradeMessage: true } }).then((recipient) => {
    if (recipient?.emailOnTradeMessage) {
      const tradeUrl = `${config.frontend.url}/trades/${trade.id}`;
      emailService.sendTradeMessageEmail(
        recipient.email,
        recipient.username,
        req.user!.username,
        trade.tradeCode,
        parsed.data.body,
        tradeUrl
      );
    }
  }).catch(() => {});

  sendCreated(res, message, "Message sent");
};
