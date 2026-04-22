export interface SupportTicketData {
  ticketNumber: string;
  username: string | null;
  email: string;
  category: string;
  urgency: string;
  subject: string;
  description: string;
  tradeCode: string | null;
  userAgent: string | null;
}

export interface IEmailService {
  sendVerificationEmail(to: string, username: string, token: string): Promise<void>;
  sendPasswordResetEmail(to: string, username: string, token: string): Promise<void>;
  sendSupportTicketEmail(data: SupportTicketData): Promise<void>;
  sendTicketConfirmation(to: string, ticketNumber: string, subject: string): Promise<void>;
  sendAdminReply(to: string, ticketNumber: string, subject: string, replyBody: string): Promise<void>;
  sendTicketResolved(to: string, ticketNumber: string, subject: string): Promise<void>;
  sendGoodbyeEmail(to: string, username: string): Promise<void>;
  sendTradeProposedEmail(to: string, receiverUsername: string, proposerUsername: string, tradeCode: string, tradeUrl: string): Promise<void>;
  sendTradeAcceptedEmail(to: string, proposerUsername: string, receiverUsername: string, tradeCode: string, tradeUrl: string): Promise<void>;
  sendTradeDeclinedEmail(to: string, proposerUsername: string, receiverUsername: string, tradeCode: string): Promise<void>;
  sendTradeCancelledEmail(to: string, recipientUsername: string, actorUsername: string, tradeCode: string, tradeUrl: string): Promise<void>;
  sendTradeCounterOfferEmail(to: string, recipientUsername: string, actorUsername: string, tradeCode: string, tradeUrl: string): Promise<void>;
}
