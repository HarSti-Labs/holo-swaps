import { Response } from "express";
import { TradeStatus } from "@prisma/client";
import { AuthenticatedRequest } from "@/types";
import { TradeService } from "@/services/implementations/TradeService";
import { StripeService } from "@/services/implementations/StripeService";
import { TrackingService } from "@/services/implementations/TrackingService";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";

const tradeService = new TradeService();
const stripeService = new StripeService();
const trackingService = new TrackingService();

const proposeTradeSchema = z.object({
  receiverId: z.string().uuid(),
  proposerCollectionItemIds: z.array(z.string().uuid()).min(0),
  receiverCollectionItemIds: z.array(z.string().uuid()).min(1),
  // Either side can sweeten the deal — both optional, always >= 0
  proposerCashAdd: z.number().min(0).optional(),
  receiverCashAdd: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
}).refine(
  (d) => d.proposerCollectionItemIds.length > 0 || (d.proposerCashAdd ?? 0) > 0,
  { message: "You must offer at least one card or some cash" }
);

const counterOfferSchema = z.object({
  proposerCollectionItemIds: z.array(z.string().uuid()).optional(),
  receiverCollectionItemIds: z.array(z.string().uuid()).optional(),
  proposerCashAdd: z.number().min(0).optional(),
  receiverCashAdd: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
});

const trackingSchema = z.object({
  trackingNumber: z.string(),
  carrier: z.string(),
  isInsured: z.boolean(),
  insuredValue: z.number().optional(),
});

export const proposeTrade = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = proposeTradeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const trade = await tradeService.proposeTrade({
    proposerId: req.user!.id,
    ...parsed.data,
  });

  sendCreated(res, trade, "Trade proposed successfully");
};

export const counterOffer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = counterOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed");
  }

  const trade = await tradeService.counterOffer(
    req.params.tradeId,
    req.user!.id,
    parsed.data
  );

  sendSuccess(res, trade, "Counter offer sent");
};

export const acceptTrade = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.acceptTrade(
    req.params.tradeId,
    req.user!.id
  );
  sendSuccess(res, trade, "Trade accepted");
};

export const declineTrade = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.declineTrade(
    req.params.tradeId,
    req.user!.id
  );
  sendSuccess(res, trade, "Trade declined");
};

export const cancelTrade = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.cancelTrade(
    req.params.tradeId,
    req.user!.id
  );
  sendSuccess(res, trade, "Trade cancelled");
};

export const requestCancel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.requestCancelTrade(req.params.tradeId, req.user!.id);
  sendSuccess(res, trade, "Cancellation request sent");
};

export const acceptCancel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.acceptCancelTrade(req.params.tradeId, req.user!.id);
  sendSuccess(res, trade, "Trade cancelled");
};

export const submitTracking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = trackingSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const trade = await tradeService.submitTrackingNumber(
    req.params.tradeId,
    req.user!.id,
    parsed.data
  );
  sendSuccess(res, trade, "Tracking submitted");
};

export const getUserTrades = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string | undefined;

  const result = await tradeService.getUserTrades(req.user!.id, {
    page,
    limit,
    status: status as never,
  });

  sendSuccess(res, result);
};

export const getTradeById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.getTradeById(
    req.params.tradeId,
    req.user!.id
  );
  sendSuccess(res, trade);
};

export const getMatches = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const matches = await tradeService.findMatches(req.user!.id);
  sendSuccess(res, matches);
};

export const refreshPrices = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.refreshTradePrices(req.params.id, req.user!.id);
  sendSuccess(res, trade, "Prices refreshed");
};

// Admin controllers
export const confirmReceipt = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.confirmReceipt(req.params.tradeId, req.user!.id);
  sendSuccess(res, trade, "Receipt confirmed");
};

export const adminConfirmShipmentReceived = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = z.object({ senderId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "senderId is required" });
    return;
  }
  const trade = await tradeService.adminConfirmShipmentReceived(req.params.tradeId, parsed.data.senderId);
  sendSuccess(res, trade, "Shipment marked as received");
};

export const adminSubmitOutboundTracking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = z.object({
    recipientId: z.string().uuid(),
    trackingNumber: z.string(),
    carrier: z.string(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "recipientId, trackingNumber and carrier are required" });
    return;
  }
  const trade = await prisma.trade.findUnique({ where: { id: req.params.tradeId } });
  if (!trade) { res.status(404).json({ message: "Trade not found" }); return; }

  const shipment = await prisma.shipment.create({
    data: {
      tradeId: req.params.tradeId,
      senderId: req.user!.id,
      receiverId: parsed.data.recipientId,
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      direction: "OUTBOUND",
      status: "SHIPPED",
      shippedAt: new Date(),
    },
  });

  // Register with AfterShip so delivery auto-completes the trade
  trackingService.registerTracking({
    trackingNumber: parsed.data.trackingNumber,
    carrier: parsed.data.carrier,
    shipmentId: shipment.id,
    tradeId: req.params.tradeId,
  });

  sendSuccess(res, null, "Outbound tracking submitted");
};

export const adminUpdateOutboundTracking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = z.object({
    recipientId: z.string().uuid(),
    trackingNumber: z.string().min(1),
    carrier: z.string().min(1),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "recipientId, trackingNumber and carrier are required" });
    return;
  }

  const updated = await prisma.shipment.updateMany({
    where: {
      tradeId: req.params.tradeId,
      receiverId: parsed.data.recipientId,
      direction: "OUTBOUND",
    },
    data: {
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
    },
  });

  if (updated.count === 0) {
    res.status(404).json({ message: "Outbound shipment not found" });
    return;
  }

  sendSuccess(res, null, "Tracking updated");
};

export const adminVerifyCards = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const verifySchema = z.object({
    collectionItemId: z.string().uuid(),
    cardOwnerId: z.string().uuid(),
    mediaUrls: z.array(z.string().url()).default([]),
    conditionConfirmed: z.boolean(),
    conditionNotes: z.string().max(500).optional(),
    isAuthentic: z.boolean(),
  });

  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const trade = await tradeService.verifyCards(req.params.tradeId, req.user!.id, parsed.data);
  sendSuccess(res, trade, "Cards verified");
};

export const adminCompleteTrade = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.completeTrade(
    req.params.tradeId,
    req.user!.id
  );
  sendSuccess(res, trade, "Trade completed");
};

export const adminForceStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { status } = req.body;
  const allowed = ["BOTH_RECEIVED", "VERIFIED"];
  if (!status || !allowed.includes(status)) {
    throw ApiError.badRequest("status must be BOTH_RECEIVED or VERIFIED");
  }
  const trade = await tradeService.adminForceStatus(
    req.params.tradeId,
    status as TradeStatus.BOTH_RECEIVED | TradeStatus.VERIFIED
  );
  sendSuccess(res, trade, `Trade status forced to ${status}`);
};

export const adminDisputeTrade = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { notes } = req.body;
  if (!notes) throw ApiError.badRequest("Dispute notes are required");

  const trade = await tradeService.disputeTrade(
    req.params.tradeId,
    req.user!.id,
    notes
  );
  sendSuccess(res, trade, "Trade disputed");
};

export const getTradeSnapshots = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const snapshots = await tradeService.getTradeSnapshots(req.params.tradeId, req.user!.id);
  sendSuccess(res, snapshots);
};

export const getCheckoutUrl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await tradeService.getTradeById(req.params.tradeId, req.user!.id);
  const isProposer = (trade as any).proposerId === req.user!.id;
  const sessionId = isProposer
    ? (trade as any).stripeProposerSessionId
    : (trade as any).stripeReceiverSessionId;

  if (!sessionId) {
    throw ApiError.notFound("No checkout session found for this trade");
  }
  const session = await stripeService.retrieveCheckoutSession(sessionId);
  if (!session.url) {
    throw ApiError.badRequest("Your payment session has already been completed or expired");
  }
  sendSuccess(res, { checkoutUrl: session.url });
};
