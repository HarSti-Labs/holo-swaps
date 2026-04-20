import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { AuthService } from "@/services/implementations/AuthService";
import { sendSuccess, sendCreated } from "@/utils/response";
import { z } from "zod";
import { ApiError } from "@/utils/ApiError";
import { prisma } from "@/config/prisma";

const authService = new AuthService();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const result = await authService.register(parsed.data);
  sendCreated(res, result, "Account created successfully");
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest("Validation failed");

  const deviceInfo = req.headers["user-agent"];
  const result = await authService.login(parsed.data, deviceInfo);

  if (result.requiresTwoFactor) {
    // Don't hand out tokens yet — client must complete 2FA at POST /api/auth/2fa/verify
    sendSuccess(res, { requiresTwoFactor: true, twoFactorToken: result.twoFactorToken });
  } else {
    sendSuccess(res, result, "Login successful");
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) throw ApiError.badRequest("Refresh token is required");

  const result = await authService.refreshToken(token);
  sendSuccess(res, result);
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) throw ApiError.badRequest("Refresh token is required");

  await authService.logout(token);
  sendSuccess(res, null, "Logged out successfully");
};

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

  // Query database for fresh user data instead of using stale JWT data
  const freshUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      isEmailVerified: true,
      avatarUrl: true,
      bio: true,
      location: true,
      reputationScore: true,
      tradeCount: true,
      tier: true,
      stripeAccountVerified: true,
      isAdmin: true,
      isBanned: true,
      createdAt: true,
    },
  });

  if (!freshUser) throw ApiError.notFound("User not found");

  sendSuccess(res, freshUser);
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    throw ApiError.badRequest("Verification token is required");
  }

  await authService.verifyEmail(token);
  sendSuccess(res, null, "Email verified successfully");
};

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.errors.map((e) => e.message));
  }

  await authService.forgotPassword(parsed.data.email);
  // Always return 200 — don't leak whether the email exists
  sendSuccess(res, null, "If an account with that email exists, a reset link has been sent");
};

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.errors.map((e) => e.message));
  }

  await authService.resetPassword(parsed.data.token, parsed.data.newPassword);
  sendSuccess(res, null, "Password reset successfully. Please log in with your new password.");
};

// GET /api/auth/check-username?username=xxx
export const checkUsernameAvailability = async (req: Request, res: Response): Promise<void> => {
  const rawUsername = req.query.username;

  if (!rawUsername || typeof rawUsername !== "string") {
    throw ApiError.badRequest("Username is required");
  }

  const username = rawUsername.toLowerCase();

  // Validate username format
  if (username.length < 3 || username.length > 20) {
    sendSuccess(res, { available: false, reason: "Username must be 3-20 characters" });
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    sendSuccess(res, { available: false, reason: "Username can only contain letters, numbers, and underscores" });
    return;
  }

  const isAvailable = await authService.isUsernameAvailable(username);
  sendSuccess(res, {
    available: isAvailable,
    ...(isAvailable ? {} : { reason: "Username is already taken" })
  });
};

// GET /api/auth/check-email?email=xxx
export const checkEmailAvailability = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.query;

  if (!email || typeof email !== "string") {
    throw ApiError.badRequest("Email is required");
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    sendSuccess(res, { available: false, reason: "Invalid email format" });
    return;
  }

  const isAvailable = await authService.isEmailAvailable(email);
  sendSuccess(res, {
    available: isAvailable,
    ...(isAvailable ? {} : { reason: "Email is already registered" })
  });
};

export const resendVerificationEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

  await authService.resendVerificationEmail(req.user.id);
  sendSuccess(res, null, "Verification email sent");
};

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user?.id) throw ApiError.unauthorized("Not authenticated");

  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.errors.map((e) => e.message));
  }

  await authService.deleteAccount(req.user.id, parsed.data.password);
  sendSuccess(res, null, "Account deleted successfully");
};
