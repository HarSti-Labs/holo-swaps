"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { authApi } from "@/lib/api/auth";
import { Eye, EyeOff, UserPlus, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  // Validation states
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailMessage, setEmailMessage] = useState("");

  // Debounce timers
  useEffect(() => {
    if (form.username.length < 3) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(form.username);
        setUsernameStatus(result.available ? "available" : "taken");
        setUsernameMessage(result.reason || (result.available ? "Username is available!" : "Username is already taken"));
      } catch {
        setUsernameStatus("idle");
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [form.username]);

  useEffect(() => {
    if (!form.email || !form.email.includes("@")) {
      setEmailStatus("idle");
      setEmailMessage("");
      return;
    }

    setEmailStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const result = await authApi.checkEmail(form.email);
        setEmailStatus(result.available ? "available" : "taken");
        setEmailMessage(result.reason || (result.available ? "Email is available!" : "Email is already registered"));
      } catch {
        setEmailStatus("idle");
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [form.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Client-side validation
    if (usernameStatus === "taken") {
      setErrors(["Username is already taken"]);
      return;
    }
    if (emailStatus === "taken") {
      setErrors(["Email is already registered"]);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrors(["Passwords do not match"]);
      return;
    }
    if (!agreedToTerms) {
      setErrors(["You must agree to the Terms of Service to create an account"]);
      return;
    }

    try {
      await register(form.email, form.username, form.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const apiErrors =
        (err as { response?: { data?: { errors?: string[]; message?: string } } })
          ?.response?.data?.errors;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrors(apiErrors ?? (message ? [message] : ["Something went wrong"]));
    }
  };

  const getValidationIcon = (status: typeof usernameStatus) => {
    switch (status) {
      case "checking":
        return <Loader2 size={18} className="text-blue-400 animate-spin" />;
      case "available":
        return <CheckCircle2 size={18} className="text-green-400" />;
      case "taken":
        return <XCircle size={18} className="text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 relative overflow-hidden">
      {/* Animated background orbs */}
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
          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-slate-400">Join the trading community</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-3xl p-8 shadow-2xl">
          {errors.length > 0 && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-sm text-red-400 space-y-1">
              {errors.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {getValidationIcon(emailStatus)}
                </div>
              </div>
              {emailMessage && (
                <p className={`text-xs mt-2 ${emailStatus === "available" ? "text-green-400" : "text-red-400"}`}>
                  {emailMessage}
                </p>
              )}
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                  placeholder="ProfessorOak"
                  minLength={3}
                  maxLength={20}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {getValidationIcon(usernameStatus)}
                </div>
              </div>
              {usernameMessage ? (
                <p className={`text-xs mt-2 ${usernameStatus === "available" ? "text-green-400" : "text-red-400"}`}>
                  {usernameMessage}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-2">
                  3–20 characters, letters, numbers, underscores only
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  placeholder="Min. 8 characters"
                  minLength={8}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  placeholder="Re-enter your password"
                  className={`w-full px-4 py-3.5 pr-12 rounded-xl border-2 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400 ${
                    passwordsMismatch
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : passwordsMatch
                      ? "border-green-500 focus:ring-green-500 focus:border-green-500"
                      : "border-slate-700 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-xs mt-2 text-red-400 flex items-center gap-1">
                  <XCircle size={12} /> Passwords do not match
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs mt-2 text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Passwords match
                </p>
              )}
            </div>

            {/* Terms of Service */}
            <div className="pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      agreedToTerms
                        ? "bg-blue-600 border-blue-600"
                        : "bg-slate-950/50 border-slate-600 group-hover:border-slate-400"
                    }`}
                  >
                    {agreedToTerms && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-400 leading-snug">
                  I agree to the{" "}
                  <Link href="/legal/tos" target="_blank" className="text-blue-400 hover:text-blue-300 font-medium underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/legal/privacy" target="_blank" className="text-blue-400 hover:text-blue-300 font-medium underline">
                    Privacy Policy
                  </Link>
                  . I understand that HoloSwaps facilitates card trades and I am responsible for shipping cards as agreed.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || usernameStatus === "taken" || emailStatus === "taken" || usernameStatus === "checking" || emailStatus === "checking" || passwordsMismatch || !agreedToTerms}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={20} />
              )}
              Create account
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
