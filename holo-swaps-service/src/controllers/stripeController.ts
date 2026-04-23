import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { prisma } from "@/config/prisma";
import { StripeService } from "@/services/implementations/StripeService";
import { config } from "@/config";
import { logger } from "@/utils/logger";
import Stripe from "stripe";

const stripeService = new StripeService();

// POST /api/stripe/setup-customer
export const setupCustomer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw ApiError.notFound("User not found");

  if (user.stripeCustomerId) {
    sendSuccess(res, { customerId: user.stripeCustomerId }, "Customer already set up");
    return;
  }

  const customerId = await stripeService.createCustomer(user.id, user.email);
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customerId },
  });

  sendSuccess(res, { customerId }, "Stripe customer created");
};

// POST /api/stripe/connect
export const setupConnectAccount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw ApiError.notFound("User not found");

  if (user.stripeAccountId && user.stripeAccountVerified) {
    sendSuccess(res, { accountId: user.stripeAccountId }, "Connect account already verified");
    return;
  }

  let accountId = user.stripeAccountId;
  if (!accountId) {
    accountId = await stripeService.createConnectAccount(user.id, user.email);
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeAccountId: accountId },
    });
  }

  const returnUrl = `${config.frontend.url}/settings?setup=success`;
  const refreshUrl = `${config.frontend.url}/settings?setup=refresh`;
  const onboardingUrl = await stripeService.getConnectAccountLink(
    accountId,
    returnUrl,
    refreshUrl
  );

  sendSuccess(res, { accountId, onboardingUrl });
};

// POST /api/stripe/verify-identity
export const verifyIdentity = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw ApiError.notFound("User not found");

  if (user.isIdentityVerified) {
    sendSuccess(res, { verified: true }, "Identity already verified");
    return;
  }

  const returnUrl = `${config.frontend.url}/settings/identity?verified=true`;
  const { sessionId, url } = await stripeService.createIdentityVerificationSession(
    user.id,
    returnUrl
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeIdentitySessionId: sessionId },
  });

  sendSuccess(res, { verificationUrl: url });
};

// POST /api/webhooks/stripe  — raw body, no auth
export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) throw ApiError.badRequest("Missing stripe-signature header");

  let event: Stripe.Event;
  try {
    event = stripeService.constructWebhookEvent(req.body as Buffer, sig);
  } catch {
    throw ApiError.badRequest("Invalid webhook signature");
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      logger.info("PaymentIntent succeeded", {
        paymentIntentId: pi.id,
        tradeId: pi.metadata?.tradeId,
      });
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tradeId = session.metadata?.tradeId;
      if (tradeId && session.payment_intent) {
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;

        // Determine which party completed payment by matching session ID
        const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
        if (trade) {
          const isProposerSession = trade.stripeProposerSessionId === session.id;
          const isReceiverSession = trade.stripeReceiverSessionId === session.id;

          if (isProposerSession) {
            await prisma.trade.update({
              where: { id: tradeId },
              data: { stripeProposerIntentId: paymentIntentId },
            });
            logger.info("Proposer payment complete", { tradeId, paymentIntentId });
          } else if (isReceiverSession) {
            await prisma.trade.update({
              where: { id: tradeId },
              data: { stripeReceiverIntentId: paymentIntentId },
            });
            logger.info("Receiver payment complete", { tradeId, paymentIntentId });
          }
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const tradeId = pi.metadata?.tradeId;
      if (tradeId) {
        logger.warn("Payment failed for trade", { tradeId });
        await prisma.trade.update({
          where: { id: tradeId },
          data: { adminNotes: "Payment failed — manual review required" },
        });
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled) {
        await prisma.user.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeAccountVerified: true },
        });
        logger.info("Stripe Connect account verified", { accountId: account.id });
      }
      break;
    }

    case "identity.verification_session.verified": {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.userId;
      if (userId) {
        await prisma.user.updateMany({
          where: { id: userId },
          data: { isIdentityVerified: true },
        });
        logger.info("User identity verified via Stripe Identity", { userId, sessionId: session.id });
      }
      break;
    }

    case "identity.verification_session.requires_input": {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.userId;
      logger.warn("Identity verification requires additional input", {
        userId,
        sessionId: session.id,
        lastError: session.last_error,
      });
      break;
    }

    default:
      logger.info(`Unhandled Stripe event: ${event.type}`);
  }

  res.json({ received: true });
};
