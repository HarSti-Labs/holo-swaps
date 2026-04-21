"use client";

import { EmailVerificationBanner } from "@/components/shared/EmailVerificationBanner";
import { TradeCard } from "@/components/trade/TradeCard";
import { useMyTrades } from "@/lib/hooks/useTrades";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { Repeat2, Sparkles, CheckCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: tradesData, isLoading } = useMyTrades({ limit: 5 });

  const trades = tradesData?.data ?? [];
  const activeTrades = trades.filter((t) =>
    ["PROPOSED", "COUNTERED", "ACCEPTED", "BOTH_SHIPPED", "A_RECEIVED", "B_RECEIVED", "BOTH_RECEIVED", "VERIFIED"].includes(t.status)
  );
  const completedTrades = trades.filter((t) => t.status === "COMPLETED");

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Email Verification Banner */}
        {user && !user.isEmailVerified && <EmailVerificationBanner />}

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">
            Welcome back, {user?.username} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your trades.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Trades",
              value: user?.tradeCount ?? 0,
              icon: Repeat2,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Active Trades",
              value: activeTrades.length,
              icon: Clock,
              color: "text-yellow-500",
              bg: "bg-yellow-500/10",
            },
            {
              label: "Completed",
              value: completedTrades.length,
              icon: CheckCircle,
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Reputation",
              value: `${user?.reputationScore?.toFixed(1) ?? "0.0"}★`,
              icon: Sparkles,
              color: "text-accent",
              bg: "bg-accent/10",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="font-display text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Trades */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">
                Recent Trades
              </h2>
              <Link
                href="/trades"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 bg-muted rounded-xl shimmer"
                  />
                ))}
              </div>
            ) : trades.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <Repeat2 size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No trades yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse matches to start your first trade
                </p>
                <Link
                  href="/matches"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  Find matches
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map((trade) => (
                  <TradeCard key={trade.id} trade={trade} />
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              {[
                {
                  href: "/collection",
                  label: "Manage Collection",
                  description: "Add or update your cards",
                  icon: "🃏",
                },
                {
                  href: "/collection?tab=wants",
                  label: "Manage Want List",
                  description: "Cards you're looking for",
                  icon: "✨",
                },
                {
                  href: "/matches",
                  label: "Browse Matches",
                  description: "Find perfect trade partners",
                  icon: "🔍",
                },
              ].map(({ href, label, description, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
