"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/hooks/useAuth";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { loadUser, isAuthenticated } = useAuthStore();
  const hasVerified = useRef(false);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus("success");
        setMessage("Your email has been verified successfully! You can now start trading.");

        // If user is logged in, refresh their data to update verification status
        if (isAuthenticated) {
          await loadUser();
        }
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.response?.data?.message ||
          "Verification failed. The link may have expired or is invalid."
        );
      }
    };

    verifyEmail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            {status === "loading" && (
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            )}
            {status === "error" && (
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-3">
            {status === "loading" && "Verifying Email..."}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </h1>

          {/* Message */}
          <p className={`text-sm mb-6 ${
            status === "success" ? "text-green-400" :
            status === "error" ? "text-red-400" :
            "text-slate-400"
          }`}>
            {message}
          </p>

          {/* Action buttons */}
          {status === "success" && (
            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              Sign In to Continue
            </Link>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="inline-block px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Sign In
              </Link>
              <p className="text-xs text-slate-500">
                You can request a new verification email from your dashboard after signing in.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
