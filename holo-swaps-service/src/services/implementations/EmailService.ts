import { Resend } from "resend";
import { config } from "@/config";
import { IEmailService, SupportTicketData } from "@/services/interfaces/IEmailService";
import { logger } from "@/utils/logger";

export class EmailService implements IEmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(config.resend.apiKey);
  }

  async sendVerificationEmail(to: string, username: string, token: string): Promise<void> {
    const verifyUrl = `${config.frontend.url}/verify-email?token=${token}`;

    try {
      await this.resend.emails.send({
        from: config.resend.from,
        to,
        subject: "Verify your Holo Swaps email address",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
            <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e0e0e0;">
              <h1 style="color: #1a1a2e; font-size: 24px; margin-top: 0;">Welcome to Holo Swaps, ${username}!</h1>
              <p style="color: #444; font-size: 16px; line-height: 1.5;">
                Thanks for signing up. Please verify your email address to get started trading.
              </p>
              <p style="color: #444; font-size: 16px; line-height: 1.5;">
                This link expires in <strong>24 hours</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}"
                   style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #888; font-size: 13px;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="color: #888; font-size: 13px;">
                Or copy this link: <a href="${verifyUrl}" style="color: #4f46e5;">${verifyUrl}</a>
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.error("Failed to send verification email", { to, err });
    }
  }

  async sendPasswordResetEmail(to: string, username: string, token: string): Promise<void> {
    const resetUrl = `${config.frontend.url}/auth/reset-password?token=${token}`;

    try {
      await this.resend.emails.send({
        from: config.resend.from,
        to,
        subject: "Reset your Holo Swaps password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
            <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e0e0e0;">
              <h1 style="color: #1a1a2e; font-size: 24px; margin-top: 0;">Password Reset Request</h1>
              <p style="color: #444; font-size: 16px; line-height: 1.5;">
                Hi ${username}, we received a request to reset the password for your Holo Swaps account.
              </p>
              <p style="color: #444; font-size: 16px; line-height: 1.5;">
                This link expires in <strong>1 hour</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}"
                   style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #888; font-size: 13px;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not change.
              </p>
              <p style="color: #888; font-size: 13px;">
                Or copy this link: <a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a>
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.error("Failed to send password reset email", { to, err });
    }
  }

  async sendSupportTicketEmail(data: SupportTicketData): Promise<void> {
    const urgencyColor = data.urgency === "URGENT" ? "#dc2626" : data.urgency === "HIGH" ? "#f97316" : "#4f46e5";
    const urgencyLabel = data.urgency === "URGENT" ? "🔴 URGENT" : data.urgency === "HIGH" ? "🟠 High" : "🔵 Normal";

    const row = (label: string, value: string) =>
      `<tr>
        <td style="padding: 8px 12px; font-weight: bold; color: #555; white-space: nowrap; vertical-align: top; width: 140px;">${label}</td>
        <td style="padding: 8px 12px; color: #222;">${value}</td>
      </tr>`;

    try {
      await this.resend.emails.send({
        from: config.resend.from,
        to: "admin@holoswaps.com",
        replyTo: data.email,
        subject: `[${data.ticketNumber}] [${data.urgency}] ${data.category} — ${data.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
            <div style="background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden;">

              <div style="background: ${urgencyColor}; padding: 16px 24px;">
                <h1 style="color: #fff; font-size: 18px; margin: 0;">HoloSwaps Support Ticket</h1>
                <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 4px 0 0;">
                  ${data.ticketNumber} &nbsp;·&nbsp; ${urgencyLabel}
                </p>
              </div>

              <div style="padding: 24px;">
                <table style="width: 100%; border-collapse: collapse; background: #f8f8f8; border-radius: 6px; overflow: hidden;">
                  <tbody>
                    ${row("Ticket #", data.ticketNumber)}
                    ${row("Category", data.category)}
                    ${row("Urgency", urgencyLabel)}
                    ${row("Username", data.username ?? "(not logged in)")}
                    ${row("Email", `<a href="mailto:${data.email}" style="color: #4f46e5;">${data.email}</a>`)}
                    ${data.tradeCode ? row("Trade Code", `<strong>${data.tradeCode}</strong>`) : ""}
                    ${data.userAgent ? row("User Agent", `<span style="font-size: 11px; color: #888;">${data.userAgent}</span>`) : ""}
                  </tbody>
                </table>

                <h2 style="font-size: 16px; color: #1a1a2e; margin: 24px 0 8px;">${data.subject}</h2>
                <div style="background: #f3f4f6; border-left: 4px solid ${urgencyColor}; border-radius: 4px; padding: 16px; color: #333; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${data.description}</div>

                <p style="margin-top: 24px; font-size: 12px; color: #aaa;">
                  Reply to this email to respond directly to the user. Ticket submitted at ${new Date().toUTCString()}.
                </p>
              </div>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.error("Failed to send support ticket email", { ticketNumber: data.ticketNumber, err });
      throw err;
    }
  }

  async sendTicketConfirmation(to: string, ticketNumber: string, subject: string): Promise<void> {
    const profileUrl = `${config.frontend.url}/support/tickets/${ticketNumber}`;
    try {
      await this.resend.emails.send({
        from: config.resend.from,
        to,
        subject: `[${ticketNumber}] We received your support request`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
            <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e0e0e0;">
              <h1 style="color: #1a1a2e; font-size: 22px; margin-top: 0;">We got your message</h1>
              <p style="color: #444; font-size: 15px; line-height: 1.6;">
                Thanks for reaching out. We've received your support request and will get back to you as soon as possible.
              </p>
              <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Ticket number</p>
                <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold; font-family: monospace; color: #1a1a2e;">${ticketNumber}</p>
                <p style="margin: 8px 0 0; font-size: 13px; color: #555;">${subject}</p>
              </div>
              <p style="color: #444; font-size: 14px; line-height: 1.6;">
                You can track the status of your ticket and view our replies at any time from the <strong>Support Tickets</strong> tab on your profile, or by clicking the button below.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${profileUrl}"
                   style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: bold; display: inline-block;">
                  View My Ticket
                </a>
              </div>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                If you need to reach us directly, reply to this email or contact <a href="mailto:admin@holoswaps.com" style="color: #4f46e5;">admin@holoswaps.com</a>.
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.error("Failed to send ticket confirmation email", { ticketNumber, err });
    }
  }

  async sendAdminReply(to: string, ticketNumber: string, subject: string, replyBody: string): Promise<void> {
    const ticketUrl = `${config.frontend.url}/support/tickets/${ticketNumber}`;
    try {
      await this.resend.emails.send({
        from: config.resend.from,
        to,
        subject: `Re: [${ticketNumber}] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
            <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e0e0e0;">
              <p style="color: #888; font-size: 12px; margin-top: 0; text-transform: uppercase; letter-spacing: 1px;">HoloSwaps Support · ${ticketNumber}</p>
              <h1 style="color: #1a1a2e; font-size: 20px; margin-top: 4px;">We replied to your ticket</h1>
              <div style="background: #eff6ff; border-left: 4px solid #4f46e5; border-radius: 4px; padding: 16px; margin: 24px 0; color: #1e3a5f; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${replyBody}</div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${ticketUrl}"
                   style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: bold; display: inline-block;">
                  View Full Conversation
                </a>
              </div>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                You can reply directly in the ticket thread. To contact us another way: <a href="mailto:admin@holoswaps.com" style="color: #4f46e5;">admin@holoswaps.com</a>
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.error("Failed to send admin reply email", { ticketNumber, err });
    }
  }

  async sendGoodbyeEmail(to: string, username: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: config.resend.from,
        to,
        subject: "Your Holo Swaps account has been deleted",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
            <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e0e0e0;">
              <h1 style="color: #1a1a2e; font-size: 24px; margin-top: 0;">Goodbye, ${username}</h1>
              <p style="color: #444; font-size: 16px; line-height: 1.5;">
                Your Holo Swaps account has been permanently deleted as requested. All your data, collection, and trade history have been removed from our platform.
              </p>
              <p style="color: #444; font-size: 16px; line-height: 1.5;">
                We're sorry to see you go. If you ever want to come back, you're always welcome to create a new account.
              </p>
              <p style="color: #444; font-size: 16px; line-height: 1.5;">
                If you did not request this deletion or believe this was a mistake, please contact us immediately at <a href="mailto:admin@holoswaps.com" style="color: #4f46e5;">admin@holoswaps.com</a>.
              </p>
              <p style="color: #888; font-size: 13px; margin-top: 32px;">
                Thank you for being part of Holo Swaps. We hope to see you again someday. 👋
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.error("Failed to send goodbye email", { to, err });
    }
  }

  async sendTicketResolved(to: string, ticketNumber: string, subject: string): Promise<void> {
    const ticketUrl = `${config.frontend.url}/support/tickets/${ticketNumber}`;
    try {
      await this.resend.emails.send({
        from: config.resend.from,
        to,
        subject: `[${ticketNumber}] Your ticket has been resolved`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9;">
            <div style="background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e0e0e0;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #dcfce7; border-radius: 50%;">
                  <span style="font-size: 28px;">✓</span>
                </div>
              </div>
              <h1 style="color: #1a1a2e; font-size: 22px; margin-top: 0; text-align: center;">Ticket Resolved</h1>
              <p style="color: #444; font-size: 15px; line-height: 1.6; text-align: center;">
                Your support ticket <strong>${ticketNumber}</strong> has been marked as resolved.
              </p>
              <p style="color: #555; font-size: 13px; text-align: center; margin-bottom: 28px;">${subject}</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${ticketUrl}"
                   style="background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 15px; font-weight: bold; display: inline-block;">
                  View Ticket
                </a>
              </div>
              <p style="color: #888; font-size: 12px; margin-top: 24px; text-align: center;">
                If you still need help, please open a new support ticket.
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      logger.error("Failed to send ticket resolved email", { ticketNumber, err });
    }
  }
}
