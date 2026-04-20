import { create } from "zustand";
import { User } from "@/types";
import { authApi } from "@/lib/api/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authApi.login({ email, password });
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
    } catch {
      localStorage.removeItem("auth_token");
      set({ user: null, token: null, isAuthenticated: false });
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
