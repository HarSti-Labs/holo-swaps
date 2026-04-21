import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { config } from "@/config";
import { prisma } from "@/config/prisma";
import { ApiError } from "@/utils/ApiError";
import { UserRepository } from "@/repositories/implementations/UserRepository";
import {
  IAuthService,
  RegisterData,
  LoginData,
  AuthResult,
  LoginResult,
  TokenPayload,
  TwoFactorTokenPayload,
} from "@/services/interfaces/IAuthService";
import { EmailService } from "@/services/implementations/EmailService";
import { SafeUser } from "@/types";

const TWO_FACTOR_TOKEN_TTL = "5m";
const TWO_FACTOR_ISSUER = "Holo Swaps";
const BACKUP_CODE_COUNT = 8;

const REFRESH_TOKEN_TTL_DAYS = 30;

export class AuthService implements IAuthService {
  private userRepository: UserRepository;
  private emailService: EmailService;

  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
  }

  async register(data: RegisterData): Promise<AuthResult> {
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) throw ApiError.conflict("Email already in use");

    const existingUsername = await this.userRepository.findByUsername(data.username);
    if (existingUsername) throw ApiError.conflict("Username already taken");

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.userRepository.create({
      email: data.email,
      username: data.username,
      passwordHash,
    });

    // Generate email verification token (fire-and-forget)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
      },
    });
    this.emailService.sendVerificationEmail(user.email, user.username, verificationToken);

    const token = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);

    return { user, token, refreshToken };
  }

  async login(data: LoginData, deviceInfo?: string): Promise<LoginResult> {
    const isEmail = data.identifier.includes("@");
    const user = isEmail
      ? await this.userRepository.findByEmail(data.identifier)
      : await prisma.user.findFirst({
          where: { username: { equals: data.identifier, mode: "insensitive" } },
        });
    if (!user) throw ApiError.unauthorized("Invalid email or password");
    if (user.isBanned) throw ApiError.forbidden("Your account has been suspended");

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) throw ApiError.unauthorized("Invalid email or password");

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // If 2FA is enabled, return a short-lived challenge token instead of full auth
    if (user.twoFactorEnabled) {
      const payload: TwoFactorTokenPayload = { userId: user.id, twoFactorPending: true };
      const twoFactorToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: TWO_FACTOR_TOKEN_TTL,
      } as jwt.SignOptions);
      return { requiresTwoFactor: true, twoFactorToken };
    }

    const safeUser: SafeUser = { ...user, passwordHash: undefined as never };
    const token = this.generateAccessToken(safeUser);
    const refreshToken = await this.createRefreshToken(user.id, deviceInfo);
    return { requiresTwoFactor: false, user: safeUser, token, refreshToken };
  }

  async verifyTwoFactor(twoFactorToken: string, code: string): Promise<AuthResult> {
    let payload: TwoFactorTokenPayload;
    try {
      payload = jwt.verify(twoFactorToken, config.jwt.secret) as TwoFactorTokenPayload;
    } catch {
      throw ApiError.unauthorized("Two-factor token is invalid or expired");
    }

    if (!payload.twoFactorPending) {
      throw ApiError.unauthorized("Invalid two-factor token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.twoFactorSecret) throw ApiError.unauthorized("User not found");
    if (user.isBanned) throw ApiError.forbidden("Your account has been suspended");

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });

    if (!isValid) {
      // Check backup codes
      const backupCodes = (user.twoFactorBackupCodes as string[] | null) ?? [];
      const matchIndex = await this.findAndConsumeBackupCode(backupCodes, code, user.id);
      if (matchIndex === -1) throw ApiError.unauthorized("Invalid two-factor code");
    }

    const safeUser: SafeUser = { ...user, passwordHash: undefined as never };
    const token = this.generateAccessToken(safeUser);
    const refreshToken = await this.createRefreshToken(user.id);
    return { user: safeUser, token, refreshToken };
  }

  async refreshToken(token: string): Promise<AuthResult> {
    const record = await prisma.refreshToken.findUnique({ where: { token } });

    if (!record) throw ApiError.unauthorized("Invalid refresh token");
    if (record.revokedAt) throw ApiError.unauthorized("Refresh token has been revoked");
    if (record.expiresAt < new Date()) throw ApiError.unauthorized("Refresh token has expired");

    const user = await this.userRepository.findById(record.userId);
    if (!user) throw ApiError.unauthorized("User not found");
    if (user.isBanned) throw ApiError.forbidden("Your account has been suspended");

    // Rotate: revoke old token, issue new one
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.createRefreshToken(user.id, record.deviceInfo ?? undefined);

    return { user, token: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch {
      throw ApiError.unauthorized("Invalid or expired token");
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) throw ApiError.badRequest("Invalid or expired verification token");
    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw ApiError.badRequest("Verification token has expired");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Silently return if user not found — don't leak existence
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: resetExpiresAt,
      },
    });

    this.emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) throw ApiError.badRequest("Invalid or expired reset token");
    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw ApiError.badRequest("Password reset token has expired");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      }),
      // Revoke all existing refresh tokens
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async setup2FA(userId: string): Promise<{ secret: string; qrCodeDataUrl: string; backupCodes: string[] }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");
    if (user.twoFactorEnabled) throw ApiError.conflict("Two-factor authentication is already enabled");

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, TWO_FACTOR_ISSUER, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Generate plain-text backup codes, hash for storage
    const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
      crypto.randomBytes(5).toString("hex").toUpperCase()
    );
    const hashedCodes = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));

    // Store the secret temporarily (unconfirmed) until confirm2FA is called
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorBackupCodes: hashedCodes },
    });

    return { secret, qrCodeDataUrl, backupCodes: plainCodes };
  }

  async confirm2FA(userId: string, code: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) throw ApiError.badRequest("2FA setup not started");
    if (user.twoFactorEnabled) throw ApiError.conflict("Two-factor authentication is already enabled");

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) throw ApiError.badRequest("Invalid code — please check your authenticator app");

    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  }

  async disable2FA(userId: string, code: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw ApiError.badRequest("Two-factor authentication is not enabled");
    }

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) throw ApiError.unauthorized("Invalid two-factor code");

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null },
    });
  }

  // Returns -1 if no match; otherwise removes the used code and returns its index
  private async findAndConsumeBackupCode(
    hashedCodes: string[],
    inputCode: string,
    userId: string
  ): Promise<number> {
    const upperInput = inputCode.toUpperCase().replace(/\s/g, "");
    for (let i = 0; i < hashedCodes.length; i++) {
      const match = await bcrypt.compare(upperInput, hashedCodes[i]);
      if (match) {
        const remaining = hashedCodes.filter((_, idx) => idx !== i);
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: remaining },
        });
        return i;
      }
    }
    return -1;
  }

  private generateAccessToken(user: SafeUser): string {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
    };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  private async createRefreshToken(userId: string, deviceInfo?: string): Promise<string> {
    const token = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await prisma.refreshToken.create({
      data: { userId, token, deviceInfo, expiresAt },
    });

    return token;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const existingUser = await this.userRepository.findByUsername(username);
    return !existingUser;
  }

  async isEmailAvailable(email: string): Promise<boolean> {
    const existingUser = await this.userRepository.findByEmail(email);
    return !existingUser;
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");
    if (user.isEmailVerified) throw ApiError.badRequest("Email is already verified");

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
      },
    });

    this.emailService.sendVerificationEmail(user.email, user.username, verificationToken);
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User not found");

    // Verify password before deleting
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw ApiError.unauthorized("Invalid password");

    // Check if user has any active trades
    const activeTrades = await prisma.trade.findFirst({
      where: {
        OR: [{ proposerId: userId }, { receiverId: userId }],
        status: {
          notIn: ["COMPLETED", "CANCELLED", "DISPUTED"],
        },
      },
    });

    if (activeTrades) {
      throw ApiError.badRequest("Cannot delete account with active trades. Please cancel or complete all trades first.");
    }

    // Delete user (cascade will handle related records due to Prisma schema onDelete: Cascade)
    await prisma.user.delete({ where: { id: userId } });
  }
}
