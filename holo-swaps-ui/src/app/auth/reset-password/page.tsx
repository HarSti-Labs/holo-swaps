"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { authApi } from "@/lib/api/auth";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Reset link is invalid or has expired. Please request a new one."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid reset link</h1>
          <p className="text-base text-slate-400 mb-6">This link is missing a reset token. Please request a new one.</p>
          <Link href="/auth/forgot-password" className="text-blue-400 hover:text-blue-300 font-bold text-base transition-colors">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
              <span className="text-white font-display font-black text-2xl">H</span>
            </div>
            <span className="font-display font-black text-3xl text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">HoloSwaps</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
          <p className="text-slate-400">Must be at least 8 characters</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-3xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Password updated!</h2>
              <p className="text-base text-slate-400">Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-base text-red-400">
                  {error}
                  {error.includes("expired") && (
                    <div className="mt-2">
                      <Link href="/auth/forgot-password" className="text-blue-400 hover:text-blue-300 font-medium underline">
                        Request a new reset link
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-base font-bold text-white mb-2">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                      className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-2">Confirm new password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter your password"
                      className={`w-full px-4 py-3.5 pr-12 rounded-xl border-2 bg-slate-950/50 text-white text-base focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400 ${
                        passwordsMismatch
                          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                          : passwordsMatch
                          ? "border-green-500 focus:ring-green-500 focus:border-green-500"
                          : "border-slate-700 focus:ring-blue-500 focus:border-blue-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordsMismatch && (
                    <p className="text-base mt-2 text-red-400 flex items-center gap-1">
                      <XCircle size={12} /> Passwords do not match
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-base mt-2 text-green-400 flex items-center gap-1">
                      <CheckCircle size={12} /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || passwordsMismatch || newPassword.length < 8}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Reset password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
