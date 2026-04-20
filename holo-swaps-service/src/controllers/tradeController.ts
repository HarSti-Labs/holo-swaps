import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { TradeService } from "@/services/implementations/TradeService";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";

const tradeService = new TradeService();

const proposeTradeSchema = z.object({
  receiverId: z.string().uuid(),
  proposerCollectionItemIds: z.array(z.string().uuid()).min(1),
  receiverCollectionItemIds: z.array(z.string().uuid()).min(1),
  // Either side can sweeten the deal — both optional, always >= 0
  proposerCashAdd: z.number().min(0).optional(),
  receiverCashAdd: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
});

const counterOfferSchema = z.object({
  proposerCollectionItemIds: z.array(z.string().uuid()).optional(),
  receiverCollectionItemIds: z.array(z.string().uuid()).optional(),
  proposerCashAdd: z.number().min(0).optional(),
  receiverCashAdd: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
});

const trackingSchema = z.object({
  trackingNumber: z.string().min(1),
  carrier: z.string().min(1),
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

export const adminVerifyCards = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const verifySchema = z.object({
    collectionItemId: z.string().uuid(),
    cardOwnerId: z.string().uuid(),
    mediaUrls: z.array(z.string().url()).min(1),
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
