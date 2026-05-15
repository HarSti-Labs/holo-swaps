import { create } from "zustand";
import { User } from "@/types";
import { authApi } from "@/lib/api/auth";
import { AxiosError } from "axios";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<{ requiresUsername: boolean; pendingGoogleToken?: string }>;
  completeGoogleSignup: (pendingGoogleToken: string, username: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (identifier, password) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.login({ identifier, password });
      localStorage.setItem("auth_token", token);
      set({ user, token, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.register({ email, username, password });
      localStorage.setItem("auth_token", token);
      set({ user, token, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async (accessToken) => {
    set({ isLoading: true });
    try {
      const result = await authApi.googleAuth(accessToken);
      if (result.requiresUsername) {
        return { requiresUsername: true, pendingGoogleToken: result.pendingGoogleToken };
      }
      localStorage.setItem("auth_token", result.token!);
      set({ user: result.user!, token: result.token!, isAuthenticated: true });
      return { requiresUsername: false };
    } finally {
      set({ isLoading: false });
    }
  },

  completeGoogleSignup: async (pendingGoogleToken, username) => {
    set({ isLoading: true });
    try {
      const result = await authApi.googleComplete(pendingGoogleToken, username);
      localStorage.setItem("auth_token", result.token);
      set({ user: result.user, token: result.token, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    set({ isLoading: true });
    try {
      const user = await authApi.me();
      set({ user, token, isAuthenticated: true });
    } catch (error) {
      // Only log out if the token is actually invalid (401) — not on network errors or server issues
      if ((error as AxiosError)?.response?.status === 401) {
        localStorage.removeItem("auth_token");
        set({ user: null, token: null, isAuthenticated: false });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUser: async () => {
    const { isAuthenticated } = get();
    if (!isAuthenticated) return;

    try {
      const user = await authApi.me();
      set({ user });
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  },
}));
