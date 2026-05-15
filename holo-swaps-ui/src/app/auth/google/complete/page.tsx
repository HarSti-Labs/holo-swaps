"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { authApi } from "@/lib/api/auth";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { FloatingLabelInput } from "@/components/ui/FloatingLabelInput";

function GoogleCompletePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingGoogleToken = searchParams.get("token") ?? "";

  const { completeGoogleSignup, isLoading } = useAuthStore();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameMessage, setUsernameMessage] = useState("");

  // Redirect if no token
  useEffect(() => {
    if (!pendingGoogleToken) router.replace("/auth/login");
  }, [pendingGoogleToken, router]);

  // Debounced username check
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(username);
        setUsernameStatus(result.available ? "available" : "taken");
        setUsernameMessage(result.reason || (result.available ? "Username is available!" : "Username is already taken"));
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const getValidationIcon = () => {
    switch (usernameStatus) {
      case "checking": return <Loader2 size={18} className="text-blue-400 animate-spin" />;
      case "available": return <CheckCircle2 size={18} className="text-green-400" />;
      case "taken": return <XCircle size={18} className="text-red-400" />;
      default: return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (usernameStatus === "taken") {
      setError("Username is already taken");
      return;
    }

    try {
      await completeGoogleSignup(pendingGoogleToken, username);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 relative overflow-hidden">
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
          <h1 className="text-2xl font-bold text-white mb-2">One last step</h1>
          <p className="text-slate-400">Choose a username for your account</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-base text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <FloatingLabelInput
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                rightElement={getValidationIcon()}
              />
              {usernameMessage ? (
                <p className={`text-base mt-2 ${usernameStatus === "available" ? "text-green-400" : "text-red-400"}`}>
                  {usernameMessage}
                </p>
              ) : (
                <p className="text-base text-slate-400 mt-2">3–20 characters, letters, numbers, underscores only</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || usernameStatus === "taken" || usernameStatus === "checking" || username.length < 3}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function GoogleCompletePage() {
  return <Suspense><GoogleCompletePageContent /></Suspense>;
}
