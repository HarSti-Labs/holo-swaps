import { Resend } from "resend";
import { config } from "@/config";
import { IEmailService } from "@/services/interfaces/IEmailService";
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
    const resetUrl = `${config.frontend.url}/reset-password?token=${token}`;

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
}
