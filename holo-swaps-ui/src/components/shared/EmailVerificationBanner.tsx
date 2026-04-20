"use client";

import { useState } from "react";
import { AlertCircle, Mail } from "lucide-react";
import { authApi } from "@/lib/api/auth";

export function EmailVerificationBanner() {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");

  const handleResend = async () => {
    setIsResending(true);
    setMessage("");
    try {
      await authApi.resendVerificationEmail();
      setMessage("Verification email sent! Check your inbox.");
    } catch (error) {
      setMessage("Failed to send email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-950/50 to-orange-950/50 border border-amber-900/50 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-100">Verify Your Email</h3>
          <p className="text-sm text-amber-200/80 mt-1">
            Please check your inbox and click the verification link to activate your account.
          </p>
          {message && (
            <p className="text-sm text-amber-300 mt-2">{message}</p>
          )}
        </div>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Mail className="h-4 w-4" />
          {isResending ? "Sending..." : "Resend Email"}
        </button>
      </div>
    </div>
  );
}
