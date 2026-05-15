"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";

interface GoogleSignInButtonProps {
  label?: string;
}

export function GoogleSignInButton({ label = "Continue with Google" }: GoogleSignInButtonProps) {
  const { loginWithGoogle, isLoading } = useAuthStore();
  const router = useRouter();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const result = await loginWithGoogle(tokenResponse.access_token);
        if (result.requiresUsername) {
          router.push(`/auth/google/complete?token=${encodeURIComponent(result.pendingGoogleToken!)}`);
        } else {
          const { user } = useAuthStore.getState();
          router.push(user?.isAdmin ? "/admin/trades" : "/dashboard");
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Google sign-in failed. Please try again.";
        alert(message);
      }
    },
    onError: () => {
      alert("Google sign-in was cancelled or failed.");
    },
  });

  return (
    <button
      type="button"
      onClick={() => handleGoogleLogin()}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white/5 border-2 border-slate-600 hover:border-slate-400 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      {label}
    </button>
  );
}
