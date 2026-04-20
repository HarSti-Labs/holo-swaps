import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { AuthService } from "@/services/implementations/AuthService";

const authService = new AuthService();

const codeSchema = z.object({ code: z.string().min(1) });

// POST /api/auth/2fa/setup
// Generates a TOTP secret + QR code. User must call /confirm before it activates.
export const setup2FA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await authService.setup2FA(req.user!.id);
  sendSuccess(res, {
    qrCodeDataUrl: result.qrCodeDataUrl,
    backupCodes: result.backupCodes,
    // secret included so users can manually enter it into an authenticator app
    secret: result.secret,
  }, "Scan the QR code with your authenticator app, then call /confirm with a code to activate");
};

// POST /api/auth/2fa/confirm
// Confirms 2FA setup by verifying the first code from the authenticator app.
export const confirm2FA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest("Validation failed");

  await authService.confirm2FA(req.user!.id, parsed.data.code);
  sendSuccess(res, null, "Two-factor authentication enabled");
};

// DELETE /api/auth/2fa
// Disables 2FA. Requires a valid current TOTP code to prevent accidental lockout.
export const disable2FA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest("Provide your current 2FA code to disable");

  await authService.disable2FA(req.user!.id, parsed.data.code);
  sendSuccess(res, null, "Two-factor authentication disabled");
};

// POST /api/auth/2fa/verify
// Second step of login when 2FA is enabled. Takes the twoFactorToken from login + a TOTP code.
export const verifyTwoFactor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const schema = z.object({
    twoFactorToken: z.string().min(1),
    code: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest("Provide twoFactorToken and code");

  const result = await authService.verifyTwoFactor(parsed.data.twoFactorToken, parsed.data.code);
  sendSuccess(res, result, "Two-factor authentication successful");
};
