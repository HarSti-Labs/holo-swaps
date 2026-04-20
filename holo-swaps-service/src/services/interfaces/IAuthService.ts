import { SafeUser } from "@/types";

export interface IAuthService {
  register(data: RegisterData): Promise<AuthResult>;
  login(data: LoginData, deviceInfo?: string): Promise<LoginResult>;
  verifyTwoFactor(twoFactorToken: string, code: string): Promise<AuthResult>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
  verifyToken(token: string): Promise<TokenPayload>;
  verifyEmail(token: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  // 2FA management
  setup2FA(userId: string): Promise<{ secret: string; qrCodeDataUrl: string; backupCodes: string[] }>;
  confirm2FA(userId: string, code: string): Promise<void>;
  disable2FA(userId: string, code: string): Promise<void>;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/** Full auth result — returned on register, refresh, and successful 2FA verify */
export interface AuthResult {
  user: SafeUser;
  token: string;
  refreshToken: string;
}

/** Login returns either full auth (2FA off) or a pending 2FA challenge */
export type LoginResult =
  | { requiresTwoFactor: false } & AuthResult
  | { requiresTwoFactor: true; twoFactorToken: string };

export interface TokenPayload {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export interface TwoFactorTokenPayload {
  userId: string;
  twoFactorPending: true;
}
