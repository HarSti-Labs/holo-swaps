"use client";

import { Navbar } from "@/components/shared/Navbar";
import { useTradeMatches } from "@/lib/hooks/useTrades";
import { formatCurrency, getInitials, cn } from "@/lib/utils";
import { Sparkles, ArrowLeftRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { TradeMatch } from "@/types";

function MatchCard({ match }: { match: TradeMatch }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 card-hover">
      {/* User header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/profile/${match.username}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {getInitials(match.username)}
            </span>
          </div>
          <div>
            <p className="font-semibold">@{match.username}</p>
            <p className="text-xs text-muted-foreground">
              {match.matchScore} card{match.matchScore !== 1 ? "s" : ""} matched
            </p>
          </div>
        </Link>

        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp size={12} />
            <span>
              {match.valueDifference === 0
                ? "Even trade"
                : `${formatCurrency(match.valueDifference)} diff`}
            </span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">
            They have (you want)
          </p>
          <div className="space-y-1.5">
            {match.theyHave.slice(0, 3).map((card) => (
              <div
                key={card.collectionItemId}
                className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-xs font-medium truncate">
                  {card.cardName}
                </span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {card.marketValue > 0 ? formatCurrency(card.marketValue) : "—"}
                </span>
              </div>
            ))}
            {match.theyHave.length > 3 && (
              <p className="text-xs text-muted-foreground px-2.5">
                +{match.theyHave.length - 3} more
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">
            You have (they want)
          </p>
          <div className="space-y-1.5">
            {match.youHave.slice(0, 3).map((card) => (
              <div
                key={card.collectionItemId}
                className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-xs font-medium truncate">
                  {card.cardName}
                </span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {card.marketValue > 0 ? formatCurrency(card.marketValue) : "—"}
                </span>
              </div>
            ))}
            {match.youHave.length > 3 && (
              <p className="text-xs text-muted-foreground px-2.5">
                +{match.youHave.length - 3} more
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action */}
      <Link
        href={`/trade/propose?receiverId=${match.userId}`}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <ArrowLeftRight size={15} />
        Propose Trade
      </Link>
    </div>
  );
}

export default function MatchesPage() {
  const { data: matches, isLoading } = useTradeMatches();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Sparkles className="text-primary" />
            Your Matches
          </h1>
          <p className="text-muted-foreground mt-1">
            Traders who have what you want — and want what you have.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-xl shimmer" />
            ))}
          </div>
        ) : !matches || matches.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <Sparkles size={40} className="text-muted-foreground mx-auto mb-4" />
            <p className="font-display font-semibold text-lg">No matches yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Add cards to your collection and want list — we'll find traders who
              match with you automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match) => (
              <MatchCard key={match.userId} match={match} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
