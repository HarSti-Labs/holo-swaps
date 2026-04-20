"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function AuthInit({ children }: { children: React.ReactNode }) {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    // Load user on mount
    loadUser();

    // Refresh user data every 5 minutes to keep it in sync
    const interval = setInterval(() => {
      loadUser();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadUser]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInit>{children}</AuthInit>
    </QueryClientProvider>
  );
}
