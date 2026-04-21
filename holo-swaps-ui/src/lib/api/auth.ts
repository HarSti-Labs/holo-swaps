import { api } from "./client";
import { ApiResponse, User } from "@/types";

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export const authApi = {
  register: async (data: RegisterPayload): Promise<AuthResult> => {
    const res = await api.post<ApiResponse<AuthResult>>("/auth/register", data);
    return res.data.data!;
  },

  login: async (data: LoginPayload): Promise<AuthResult> => {
    const res = await api.post<ApiResponse<AuthResult>>("/auth/login", data);
    return res.data.data!;
  },

  me: async (): Promise<User> => {
    const res = await api.get<ApiResponse<User>>("/auth/me");
    return res.data.data!;
  },

  refreshToken: async (token: string): Promise<{ token: string }> => {
    const res = await api.post<ApiResponse<{ token: string }>>("/auth/refresh", { token });
    return res.data.data!;
  },

  checkUsername: async (username: string): Promise<{ available: boolean; reason?: string }> => {
    const res = await api.get<ApiResponse<{ available: boolean; reason?: string }>>(
      `/auth/check-username?username=${encodeURIComponent(username)}`
    );
    return res.data.data!;
  },

  checkEmail: async (email: string): Promise<{ available: boolean; reason?: string }> => {
    const res = await api.get<ApiResponse<{ available: boolean; reason?: string }>>(
      `/auth/check-email?email=${encodeURIComponent(email)}`
    );
    return res.data.data!;
  },

  resendVerificationEmail: async (): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/resend-verification");
  },

  deleteAccount: async (password: string): Promise<void> => {
    await api.delete<ApiResponse<null>>("/auth/delete-account", { data: { password } });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/forgot-password", { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/reset-password", { token, newPassword });
  },
};
