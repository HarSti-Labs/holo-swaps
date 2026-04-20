import { Request, Response } from "express";
import { TradeStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/config/prisma";
import { TrackingService } from "@/services/implementations/TrackingService";
import { NotificationService } from "@/services/implementations/NotificationService";
import { logger } from "@/utils/logger";

const trackingService = new TrackingService();
const notificationService = new NotificationService();

/**
 * AfterShip webhook payload (simplified).
 * Full spec: https://www.aftership.com/docs/aftership/webhooks/tracking-webhook
 */
interface AfterShipEvent {
  event: string;
  msg: {
    tracking_number: string;
    slug: string;
    tag: string; // e.g. "Delivered", "InTransit", "OutForDelivery"
    custom_fields?: {
      shipmentId?: string;
      tradeId?: string;
    };
  };
}

// POST /api/webhooks/tracking
export const handleTrackingWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Verify signature
  const signature = req.headers["aftership-hmac-sha256"] as string | undefined;
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);

  if (signature && !trackingService.verifyWebhookSignature(rawBody, signature)) {
    logger.warn("AfterShip webhook signature mismatch");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const payload = req.body as AfterShipEvent;

  // We only care about delivery events
  if (payload.event !== "tracking_update" || payload.msg.tag !== "Delivered") {
    res.json({ received: true });
    return;
  }

  const { shipmentId, tradeId } = payload.msg.custom_fields ?? {};

  if (!shipmentId || !tradeId) {
    logger.warn("AfterShip webhook missing custom_fields", { payload: payload.msg });
    res.json({ received: true });
    return;
  }

  logger.info("Package delivered — auto-advancing trade", {
    shipmentId,
    tradeId,
    trackingNumber: payload.msg.tracking_number,
  });

  try {
    await handleDelivery(shipmentId, tradeId);
  } catch (err) {
    // Log but always return 200 so AfterShip doesn't retry endlessly
    logger.error("Error processing delivery webhook", { shipmentId, tradeId, err });
  }

  res.json({ received: true });
};

async function handleDelivery(shipmentId: string, tradeId: string): Promise<void> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });

  if (!shipment) {
    logger.warn("Shipment not found for delivery event", { shipmentId });
    return;
  }

  // Idempotent — skip if already marked delivered
  if (shipment.status === "DELIVERED") {
    logger.info("Shipment already marked delivered — skipping", { shipmentId });
    return;
  }

  // Mark shipment delivered
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) return;

  // Determine which party's package this was (senderId = who shipped it)
  const isProposerPackage = shipment.senderId === trade.proposerId;

  // Advance trade status
  let nextStatus: TradeStatus | null = null;

  if (trade.status === TradeStatus.BOTH_SHIPPED) {
    nextStatus = isProposerPackage ? TradeStatus.A_RECEIVED : TradeStatus.B_RECEIVED;
  } else if (trade.status === TradeStatus.A_RECEIVED && !isProposerPackage) {
    nextStatus = TradeStatus.BOTH_RECEIVED;
  } else if (trade.status === TradeStatus.B_RECEIVED && isProposerPackage) {
    nextStatus = TradeStatus.BOTH_RECEIVED;
  }

  if (!nextStatus) {
    logger.info("No status transition needed for delivery", {
      tradeId,
      currentStatus: trade.status,
      isProposerPackage,
    });
    return;
  }

  await prisma.trade.update({
    where: { id: tradeId },
    data: { status: nextStatus },
  });

  logger.info("Trade auto-advanced on delivery", {
    tradeId,
    tradeCode: trade.tradeCode,
    from: trade.status,
    to: nextStatus,
  });

  // Notify both parties when both cards are received so they know verification is next
  if (nextStatus === TradeStatus.BOTH_RECEIVED) {
    await notificationService.notifyMany([trade.proposerId, trade.receiverId], {
      type: NotificationType.SHIPMENT_UPDATED,
      title: "Both packages received",
      body: `Both cards for trade ${trade.tradeCode} have arrived. Our team will verify them shortly.`,
      data: { tradeId, tradeCode: trade.tradeCode },
    });
  }
}
