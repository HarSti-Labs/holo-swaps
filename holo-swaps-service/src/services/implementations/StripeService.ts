import Stripe from "stripe";
import { config } from "@/config";
import {
  IStripeService,
  CreatePaymentIntentData,
  TransferData,
} from "@/services/interfaces/IStripeService";
import { ApiError } from "@/utils/ApiError";

export class StripeService implements IStripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: "2023-10-16",
    });
  }

  async createCustomer(userId: string, email: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });
    return customer.id;
  }

  async createConnectAccount(userId: string, email: string): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: "express",
      email,
      metadata: { userId },
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    return account.id;
  }

  async getConnectAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });
    return link.url;
  }

  async createPaymentIntent(
    data: CreatePaymentIntentData
  ): Promise<Stripe.PaymentIntent> {
    if (data.amount <= 0) {
      throw ApiError.badRequest("Payment amount must be greater than 0");
    }

    return this.stripe.paymentIntents.create({
      amount: Math.round(data.amount),
      currency: data.currency,
      customer: data.customerId,
      capture_method: "manual", // hold funds, capture only on completion
      application_fee_amount: Math.round(data.platformFeeAmount), // platform 2.5% fee
      transfer_data: {
        destination: data.destinationAccountId,
      },
      metadata: {
        tradeId: data.tradeId,
        platformFeeAmount: data.platformFeeAmount,
      },
      description: data.description || `Trade ${data.tradeId}`,
    });
  }

  async capturePaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.capture(paymentIntentId);
  }

  async cancelPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number
  ): Promise<Stripe.Refund> {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount && { amount: Math.round(amount) }),
    });
  }

  async transferToConnectedAccount(
    data: TransferData
  ): Promise<Stripe.Transfer> {
    return this.stripe.transfers.create({
      amount: Math.round(data.amount),
      currency: "usd",
      destination: data.destinationAccountId,
      metadata: { tradeId: data.tradeId },
    });
  }

  /**
   * Creates a Stripe Identity VerificationSession for government ID + selfie verification.
   * The returned `url` is where the client redirects the user to complete verification.
   */
  async createIdentityVerificationSession(
    userId: string,
    returnUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const session = await this.stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { userId },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      return_url: returnUrl,
    });

    return { sessionId: session.id, url: session.url ?? "" };
  }

  async createCheckoutSession(data: {
    amount: number;
    platformFeeAmount: number;
    currency: string;
    customerId: string;
    destinationAccountId: string | null; // null = fee-only trade, no peer-to-peer transfer
    tradeId: string;
    tradeCode: string;
    successUrl: string;
    cancelUrl: string;
    description: string;
  }): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      mode: "payment",
      customer: data.customerId,
      line_items: [
        {
          price_data: {
            currency: data.currency,
            product_data: {
              name: `Trade ${data.tradeCode}`,
              description: data.description,
            },
            unit_amount: Math.round(data.amount),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        capture_method: "manual",
        // Only set transfer when there is a cash component going to the other party
        ...(data.destinationAccountId && {
          application_fee_amount: Math.round(data.platformFeeAmount),
          transfer_data: { destination: data.destinationAccountId },
        }),
        metadata: { tradeId: data.tradeId, platformFeeAmount: data.platformFeeAmount },
      },
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: { tradeId: data.tradeId },
    });
  }

  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  }

  /**
   * Creates a Stripe Invoice for the at-fault party covering return shipping costs.
   * Uses `send_invoice` so Stripe emails them a hosted payment link — works even if
   * they have no saved card on file. They have 7 days to pay before it becomes overdue.
   */
  async createReturnShippingInvoice(
    customerId: string,
    amountCents: number,
    tradeCode: string
  ): Promise<{ invoiceId: string; hostedInvoiceUrl: string }> {
    // 1. Add the line item to the customer's pending invoice bucket
    await this.stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(amountCents),
      currency: "usd",
      description: `Return shipping fee — Trade ${tradeCode} (card failed verification)`,
    });

    // 2. Create the invoice in send_invoice mode (emails a payment link)
    const invoice = await this.stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 7,
      description: `Return shipping for Trade ${tradeCode}`,
      metadata: { tradeCode },
    });

    // 3. Finalize sends the invoice email to the customer
    const finalized = await this.stripe.invoices.finalizeInvoice(invoice.id);

    return {
      invoiceId: finalized.id,
      hostedInvoiceUrl: finalized.hosted_invoice_url ?? "",
    };
  }
}
