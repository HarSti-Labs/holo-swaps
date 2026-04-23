"use client";

import { useAuthStore } from "@/lib/hooks/useAuth";

export function HeroSection({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user) return null;
  return <>{children}</>;
}
