import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import {
  proposeTrade,
  counterOffer,
  acceptTrade,
  declineTrade,
  cancelTrade,
  requestCancel,
  acceptCancel,
  submitTracking,
  confirmReceipt,
  getUserTrades,
  getTradeById,
  getMatches,
  refreshPrices,
  adminVerifyCards,
  adminCompleteTrade,
  adminDisputeTrade,
  getTradeSnapshots,
  getCheckoutUrl,
} from "@/controllers/tradeController";
import { getMessages, sendMessage } from "@/controllers/messageController";
import { submitReview } from "@/controllers/reviewController";
import { openDispute } from "@/controllers/disputeController";

const router = Router();

// All trade routes require authentication
router.use(authenticate);

// User trade routes
router.get("/", getUserTrades);
router.get("/matches", getMatches);
router.get("/:tradeId", getTradeById);
router.post("/", proposeTrade);
router.post("/:tradeId/counter", counterOffer);
router.patch("/:tradeId/accept", acceptTrade);
router.patch("/:tradeId/decline", declineTrade);
router.patch("/:tradeId/cancel", cancelTrade);
router.post("/:tradeId/request-cancel", requestCancel);
router.post("/:tradeId/accept-cancel", acceptCancel);
router.patch("/:tradeId/tracking", submitTracking);
router.patch("/:tradeId/received", confirmReceipt);

// Price refresh
router.post("/:id/refresh-prices", refreshPrices);

// Stripe checkout URL
router.get("/:tradeId/checkout-url", getCheckoutUrl);

// Messages
router.get("/:tradeId/snapshots", getTradeSnapshots);
router.get("/:tradeId/messages", getMessages);
router.post("/:tradeId/messages", sendMessage);

// Reviews (only for completed trades)
router.post("/:tradeId/reviews", submitReview);

// User-initiated dispute
router.post("/:tradeId/dispute", openDispute);

// Admin only routes
router.patch("/:tradeId/verify", requireAdmin, adminVerifyCards);
router.patch("/:tradeId/complete", requireAdmin, adminCompleteTrade);
router.patch("/:tradeId/admin-dispute", requireAdmin, adminDisputeTrade);

export default router;
