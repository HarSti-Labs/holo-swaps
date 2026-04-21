"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HeadphonesIcon, CheckCircle, AlertTriangle, ChevronDown,
  Hash, User, Mail, MessageSquare, Zap,
} from "lucide-react";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { supportApi } from "@/lib/api/support";
import { cn } from "@/lib/utils";

// ── Config ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "TRADE_DISPUTE",      label: "Trade Dispute",             tradeRelated: true,  description: "A problem with an active or recently completed trade" },
  { value: "CARD_CONDITION",     label: "Card Condition Issue",       tradeRelated: true,  description: "Card arrived in a different condition than listed" },
  { value: "SHIPPING_TRACKING",  label: "Shipping / Tracking",        tradeRelated: true,  description: "Lost package, delayed shipment, tracking not updating" },
  { value: "ACCOUNT_ISSUE",      label: "Account Issue",              tradeRelated: false, description: "Login problems, email verification, account access" },
  { value: "BILLING_PAYMENT",    label: "Billing / Payment",          tradeRelated: false, description: "Charges, refunds, or payment-related questions" },
  { value: "BUG_REPORT",         label: "Bug Report",                 tradeRelated: false, description: "Something on the site isn't working correctly" },
  { value: "ABUSE_FRAUD",        label: "Abuse / Fraud Report",       tradeRelated: false, description: "Report a user, scam attempt, or counterfeit card" },
  { value: "GENERAL_QUESTION",   label: "General Question",           tradeRelated: false, description: "Anything else you'd like to know" },
  { value: "OTHER",              label: "Other",                      tradeRelated: false, description: "" },
] as const;

type CategoryValue = typeof CATEGORIES[number]["value"];

const URGENCY_OPTIONS = [
  { value: "NORMAL",  label: "Normal",  desc: "Not time-sensitive",            color: "border-slate-600 text-slate-300" },
  { value: "HIGH",    label: "High",    desc: "Affects an active trade",        color: "border-orange-500/60 text-orange-300" },
  { value: "URGENT",  label: "Urgent",  desc: "Financial loss or account lock", color: "border-red-500/60 text-red-300" },
] as const;

type UrgencyValue = typeof URGENCY_OPTIONS[number]["value"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUserAgent(): string {
  if (typeof window === "undefined") return "";
  return navigator.userAgent;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const { user } = useAuthStore();

  const [email, setEmail]           = useState("");
  const [category, setCategory]     = useState<CategoryValue | "">("");
  const [urgency, setUrgency]       = useState<UrgencyValue>("NORMAL");
  const [subject, setSubject]       = useState("");
  const [description, setDescription] = useState("");
  const [tradeCode, setTradeCode]   = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState("");
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  // Pre-fill email from auth
  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const selectedCategory = CATEGORIES.find((c) => c.value === category) ?? null;
  const isTradeRelated   = selectedCategory?.tradeRelated ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setError("Please select a category."); return; }
    setError("");
    setIsLoading(true);
    try {
      const result = await supportApi.submit({
        email,
        category,
        urgency,
        subject,
        description,
        tradeCode: isTradeRelated && tradeCode ? tradeCode.trim().toUpperCase() : null,
        userAgent: getUserAgent(),
      });
      setTicketNumber(result.ticketNumber);
    } catch (err: unknown) {
      const msgs = (err as { response?: { data?: { errors?: string[]; message?: string } } })?.response?.data;
      setError(
        (msgs?.errors ?? []).join(" ") || msgs?.message || "Something went wrong. Please try again or email admin@holoswaps.com directly."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state ───────────────────────────────────────────────────────────
  if (ticketNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Ticket Submitted</h1>
            <p className="text-slate-400 text-sm mb-6">
              We've received your request and will respond to <span className="text-white font-medium">{email}</span> as soon as possible.
            </p>
            <div className="bg-slate-950/60 border border-slate-700 rounded-xl px-5 py-4 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Your ticket number</p>
              <p className="text-xl font-black text-white font-mono">{ticketNumber}</p>
              <p className="text-xs text-slate-500 mt-1">Save this for your records</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm hover:from-blue-500 hover:to-purple-500 transition-all text-center">
                Back to Home
              </Link>
              {user && (
                <Link href="/dashboard" className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-muted font-bold text-sm transition-colors text-center">
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main className="container mx-auto px-4 py-12 max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-5">
            <HeadphonesIcon size={16} />
            Support
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Contact Support</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Fill out the form below and we'll get back to you. For urgent trade issues, choose the appropriate urgency level.
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-sm text-red-400">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Who is asking — pre-filled if logged in */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user && (
                <div>
                  <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" /> Username
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/30 text-slate-400 text-sm select-none">
                    @{user.username}
                  </div>
                </div>
              )}
              <div className={user ? "" : "sm:col-span-2"}>
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" /> Your Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value as CategoryValue); setTradeCode(""); }}
                  required
                  className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {selectedCategory?.description && (
                <p className="text-xs text-slate-500 mt-2">{selectedCategory.description}</p>
              )}
            </div>

            {/* Trade code — shown for trade-related categories */}
            {isTradeRelated && (
              <div>
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-400" /> Trade Code
                  <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={tradeCode}
                  onChange={(e) => setTradeCode(e.target.value)}
                  placeholder="TRD-00142"
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Find your trade code on the trade detail page — it starts with TRD-.
                </p>
              </div>
            )}

            {/* Urgency */}
            <div>
              <label className="block text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                <Zap size={13} className="text-slate-400" /> Urgency <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUrgency(u.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all",
                      urgency === u.value
                        ? `${u.color} bg-slate-800`
                        : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                    )}
                  >
                    {u.label}
                    <span className="text-[10px] font-normal text-slate-500 text-center leading-tight">{u.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                minLength={5}
                maxLength={120}
                placeholder="Brief summary of your issue"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1.5 text-right">{subject.length}/120</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-slate-400" /> Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={20}
                maxLength={5000}
                rows={6}
                placeholder={
                  category === "BUG_REPORT"
                    ? "Describe what you were doing, what you expected to happen, and what actually happened. Steps to reproduce are very helpful."
                    : category === "ABUSE_FRAUD"
                    ? "Describe the incident in detail. Include the username(s) involved, what happened, and any evidence you have."
                    : "Please describe your issue in as much detail as possible."
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-500 resize-none"
              />
              <p className="text-xs text-slate-500 mt-1.5 text-right">{description.length}/5000</p>
            </div>

            {/* Browser info note (for bug reports) */}
            {category === "BUG_REPORT" && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
                <AlertTriangle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                Your browser and OS information will be attached automatically to help us reproduce the bug.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <HeadphonesIcon size={18} />
                  Submit Ticket
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Prefer to email directly?{" "}
            <a href="mailto:admin@holoswaps.com" className="text-blue-400 hover:text-blue-300 underline">
              admin@holoswaps.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
