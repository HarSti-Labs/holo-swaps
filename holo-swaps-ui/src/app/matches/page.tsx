"use client";

import { useState, useMemo } from "react";
import { useTradeMatches } from "@/lib/hooks/useTrades";
import { formatCurrency, getInitials, cn } from "@/lib/utils";
import {
  Sparkles, ArrowLeftRight, TrendingUp, Star, Filter,
  ChevronLeft, ChevronRight, X, ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { TradeMatch, User } from "@/types";
import { TradeProposalModal } from "@/components/trades/TradeProposalModal";

const PAGE_SIZE = 12;

// ── Sort options ────────────────────────────────────────────────────────────
type SortKey = "matchScore" | "reputationScore" | "valueDifference" | "tradeCount";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "matchScore",      label: "Best Match"       },
  { value: "reputationScore", label: "Reputation"       },
  { value: "tradeCount",      label: "Most Trades"      },
  { value: "valueDifference", label: "Closest Value"    },
];

// ── Filter state ─────────────────────────────────────────────────────────────
// Add new filter keys here as needed — the UI panel picks them up automatically.
interface Filters {
  minReputation: number;    // 0–5
  minMatchScore: number;    // 1+
  maxValueDiff: number;     // 0 = no cap
}

const DEFAULT_FILTERS: Filters = {
  minReputation: 0,
  minMatchScore: 1,
  maxValueDiff: 0,
};

// ── MatchCard component ───────────────────────────────────────────────────────
function MatchCard({ match, onPropose }: { match: TradeMatch; onPropose: (m: TradeMatch) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 card-hover flex flex-col">
      {/* User header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/profile/${match.username}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
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

        <div className="text-right space-y-1">
          <div className="flex items-center justify-end gap-1 text-xs">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            <span className="font-medium">{match.reputationScore.toFixed(1)}</span>
            <span className="text-muted-foreground">({match.tradeCount})</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <TrendingUp size={11} />
            <span>
              {match.valueDifference === 0
                ? "Even trade"
                : `${formatCurrency(match.valueDifference)} diff`}
            </span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4 flex-1">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">They have (you want)</p>
          <div className="space-y-1.5">
            {match.theyHave.slice(0, 3).map((card) => (
              <div key={card.collectionItemId} className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-medium truncate">{card.cardName}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {card.marketValue > 0 ? formatCurrency(card.marketValue) : "—"}
                </span>
              </div>
            ))}
            {match.theyHave.length > 3 && (
              <p className="text-xs text-muted-foreground px-2.5">+{match.theyHave.length - 3} more</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">You have (they want)</p>
          <div className="space-y-1.5">
            {match.youHave.slice(0, 3).map((card) => (
              <div key={card.collectionItemId} className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-medium truncate">{card.cardName}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {card.marketValue > 0 ? formatCurrency(card.marketValue) : "—"}
                </span>
              </div>
            ))}
            {match.youHave.length > 3 && (
              <p className="text-xs text-muted-foreground px-2.5">+{match.youHave.length - 3} more</p>
            )}
          </div>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={() => onPropose(match)}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors mt-auto"
      >
        <ArrowLeftRight size={15} />
        Propose Trade
      </button>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
          acc.push(p);
          return acc;
        }, [])
        .map((item, i) =>
          item === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
          ) : (
            <button
              key={item}
              onClick={() => onChange(item as number)}
              className={cn(
                "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                page === item
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-muted"
              )}
            >
              {item}
            </button>
          )
        )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MatchesPage() {
  const { data: allMatches, isLoading } = useTradeMatches();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortKey>("matchScore");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [proposalTarget, setProposalTarget] = useState<TradeMatch | null>(null);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const hasActiveFilters =
    filters.minReputation > DEFAULT_FILTERS.minReputation ||
    filters.minMatchScore > DEFAULT_FILTERS.minMatchScore ||
    filters.maxValueDiff > DEFAULT_FILTERS.maxValueDiff;

  const filtered = useMemo(() => {
    if (!allMatches) return [];
    return allMatches
      .filter((m) => {
        if (m.reputationScore < filters.minReputation) return false;
        if (m.matchScore < filters.minMatchScore) return false;
        if (filters.maxValueDiff > 0 && m.valueDifference > filters.maxValueDiff) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "valueDifference") return a.valueDifference - b.valueDifference; // lower = better
        return b[sortBy] - a[sortBy]; // higher = better for everything else
      });
  }, [allMatches, filters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Sparkles className="text-primary" />
              Your Matches
            </h1>
            <p className="text-muted-foreground mt-1">
              Traders who have what you want — and want what you have.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Sort */}
            <div className="relative">
              <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as SortKey); setPage(1); }}
                className="pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-card appearance-none cursor-pointer hover:bg-muted transition-colors"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                filtersOpen || hasActiveFilters
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              <Filter size={14} />
              Filters
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {[filters.minReputation > 0, filters.minMatchScore > 1, filters.maxValueDiff > 0].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Filter Matches</h2>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <X size={12} /> Reset all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Min reputation */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Min. Reputation
                  <span className="ml-1 text-foreground font-semibold">
                    {filters.minReputation > 0 ? `${filters.minReputation.toFixed(1)}★` : "Any"}
                  </span>
                </label>
                <input
                  type="range"
                  min={0} max={5} step={0.5}
                  value={filters.minReputation}
                  onChange={(e) => setFilter("minReputation", parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Any</span><span>5★</span>
                </div>
              </div>

              {/* Min match score */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Min. Cards Matched
                  <span className="ml-1 text-foreground font-semibold">{filters.minMatchScore}+</span>
                </label>
                <input
                  type="range"
                  min={1} max={10} step={1}
                  value={filters.minMatchScore}
                  onChange={(e) => setFilter("minMatchScore", parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span><span>10+</span>
                </div>
              </div>

              {/* Max value difference */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Max. Value Difference
                  <span className="ml-1 text-foreground font-semibold">
                    {filters.maxValueDiff > 0 ? formatCurrency(filters.maxValueDiff) : "Any"}
                  </span>
                </label>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={filters.maxValueDiff}
                  onChange={(e) => setFilter("maxValueDiff", parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Any</span><span>$100</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        {!isLoading && allMatches && allMatches.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing <span className="text-foreground font-medium">{filtered.length}</span> of{" "}
            <span className="text-foreground font-medium">{allMatches.length}</span> matches
            {hasActiveFilters && " (filtered)"}
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-xl shimmer" />
            ))}
          </div>
        ) : !allMatches || allMatches.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <Sparkles size={40} className="text-muted-foreground mx-auto mb-4" />
            <p className="font-display font-semibold text-lg">No matches yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Add cards to your collection and want list — we'll find traders who match with you automatically.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <Filter size={40} className="text-muted-foreground mx-auto mb-4" />
            <p className="font-display font-semibold text-lg">No matches with those filters</p>
            <p className="text-sm text-muted-foreground mt-2 mb-4">Try loosening your filter criteria.</p>
            <button onClick={resetFilters} className="text-sm text-primary hover:underline font-medium">
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginated.map((match) => (
                <MatchCard key={match.userId} match={match} onPropose={setProposalTarget} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </main>

      {proposalTarget && (
        <TradeProposalModal
          isOpen={true}
          onClose={() => setProposalTarget(null)}
          targetUser={proposalTarget as unknown as User}
          preselectedCards={[]}
        />
      )}
    </div>
  );
}
