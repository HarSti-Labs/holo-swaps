import Stripe from "stripe";

export interface IStripeService {
  createCustomer(userId: string, email: string): Promise<string>;
  createConnectAccount(userId: string, email: string): Promise<string>;
  getConnectAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string>;
  createPaymentIntent(data: CreatePaymentIntentData): Promise<Stripe.PaymentIntent>;
  capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;
  cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;
  refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund>;
  transferToConnectedAccount(data: TransferData): Promise<Stripe.Transfer>;
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event;
  createReturnShippingInvoice(
    customerId: string,
    amountCents: number,
    tradeCode: string
  ): Promise<{ invoiceId: string; hostedInvoiceUrl: string }>;
  createIdentityVerificationSession(
    userId: string,
    returnUrl: string
  ): Promise<{ sessionId: string; url: string }>;
}

export interface CreatePaymentIntentData {
  amount: number;              // cash-on-top in cents
  platformFeeAmount: number;   // 2.5% platform fee in cents — deducted from the transfer
  currency: string;
  customerId: string;
  destinationAccountId: string; // receiver's Stripe Connect account
  tradeId: string;
  description?: string;
}

export interface TransferData {
  amount: number; // in cents
  destinationAccountId: string;
  tradeId: string;
}
