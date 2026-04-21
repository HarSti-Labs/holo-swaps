"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchCards, getSets, getRarities, SearchCardsParams } from "@/lib/api/cards";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Card } from "@/types";
import { CardDetailModal } from "@/components/cards/CardDetailModal";

export default function CardsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState("");
  const [selectedRarity, setSelectedRarity] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: setsData } = useQuery({
    queryKey: ["sets"],
    queryFn: () => getSets(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: raritiesData } = useQuery({
    queryKey: ["rarities", selectedSet],
    queryFn: () => getRarities(selectedSet || undefined),
    staleTime: 5 * 60 * 1000,
  });

  const sets = setsData ?? [];
  const rarities = raritiesData ?? [];

  const params: SearchCardsParams = {
    ...(debouncedQuery && { q: debouncedQuery }),
    ...(selectedSet && { setCode: selectedSet }),
    ...(selectedRarity && { rarity: selectedRarity }),
    page,
    limit,
  };

  const hasFilter = debouncedQuery.trim().length > 0 || selectedSet !== "" || selectedRarity !== "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["cards", params],
    queryFn: () => searchCards(params),
    enabled: hasFilter,
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header with animated gradient */}
        <div className="mb-12 relative">
          {/* Animated gradient orbs */}
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="absolute top-40 left-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

          <div className="relative z-10">
            <h1 className="font-display text-6xl md:text-7xl font-black mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-shimmer">
              Discover Cards
            </h1>
            <p className="text-xl text-slate-300">
              Search the Pokémon card database
            </p>
          </div>
        </div>

        {/* Search + Set + Rarity filters */}
        <div className="mb-10 flex flex-col sm:flex-row gap-3 max-w-4xl mx-auto flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-400 transition-colors" size={20} />
              <Input
                type="text"
                placeholder="Search by card name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base bg-slate-900/90 backdrop-blur-xl border-2 border-slate-700 hover:border-blue-500/50 focus:border-blue-500 text-white placeholder:text-slate-500 rounded-2xl shadow-2xl transition-all"
              />
            </div>
          </div>

          {/* Set filter dropdown */}
          <div className="relative sm:w-56">
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <select
              value={selectedSet}
              onChange={(e) => { setSelectedSet(e.target.value); setSelectedRarity(""); setPage(1); }}
              className="w-full h-14 pl-4 pr-10 rounded-2xl bg-slate-800 border-2 border-slate-600 hover:border-slate-400 hover:bg-slate-700 focus:border-slate-400 text-white appearance-none cursor-pointer transition-all outline-none shadow-2xl"
            >
              <option value="">All Sets</option>
              {sets.map((s) => (
                <option key={s.setCode} value={s.setCode}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rarity filter dropdown */}
          <div className="relative sm:w-48">
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <select
              value={selectedRarity}
              onChange={(e) => { setSelectedRarity(e.target.value); setPage(1); }}
              className="w-full h-14 pl-4 pr-10 rounded-2xl bg-slate-800 border-2 border-slate-600 hover:border-slate-400 hover:bg-slate-700 focus:border-slate-400 text-white appearance-none cursor-pointer transition-all outline-none shadow-2xl"
            >
              <option value="">All Rarities</option>
              {rarities.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading cards...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load cards. Please try again.</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        )}

        {/* Pre-search prompt */}
        {!hasFilter && (
          <div className="text-center py-24">
            <div className="text-6xl mb-6">🔍</div>
            <p className="text-xl text-slate-400 font-semibold">Search or pick a set to get started</p>
            <p className="text-slate-500 mt-2">Search by name, filter by set, or narrow down by rarity</p>
          </div>
        )}

        {/* Cards Grid */}
        {hasFilter && data && !isLoading && (
          <>
            {data.data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No cards found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {data.data.map((card) => (
                  <CardItem key={card.id} card={card} onClick={() => setSelectedCard(card)} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    let pageNum;
                    if (data.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg border transition-colors ${
                          page === pageNum
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-card hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Results Info */}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, data.total)} of{" "}
              {data.total} cards
            </div>
          </>
        )}
      </main>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          card={selectedCard}
        />
      )}
    </div>
  );
}

function CardItem({ card, onClick }: { card: Card; onClick: () => void }) {
  const getRarityColor = (rarity: string | null) => {
    if (!rarity) return "bg-gradient-to-r from-slate-700 to-slate-800 text-slate-300";
    const lower = rarity.toLowerCase();
    if (lower.includes("ultra rare") || lower.includes("secret"))
      return "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white shadow-xl shadow-yellow-500/60 animate-pulse";
    if (lower.includes("rare") || lower.includes("holo") || lower.includes("illustration"))
      return "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white shadow-xl shadow-purple-500/60";
    if (lower.includes("uncommon"))
      return "bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white shadow-xl shadow-blue-500/60";
    if (lower.includes("promo"))
      return "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white shadow-xl shadow-green-500/60";
    return "bg-gradient-to-r from-slate-600 to-slate-700 text-slate-200";
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-900/50 backdrop-blur-sm border-2 border-slate-700/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-[1.05] hover:border-blue-500/70 hover:-translate-y-2 transition-all duration-500 cursor-pointer"
    >
      {/* Rainbow shimmer on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer pointer-events-none z-20" />

      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl opacity-0 group-hover:opacity-30 blur transition duration-500" />

      {/* Card Image */}
      <div className="aspect-[2/3] bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 flex items-center justify-center relative overflow-hidden">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-700"
          />
        ) : (
          <div className="text-center p-6 relative z-10">
            <div className="w-28 h-28 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/40 to-pink-500/40 flex items-center justify-center border-4 border-blue-400/40 group-hover:border-blue-400/80 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-2xl shadow-blue-500/50">
              <span className="text-6xl filter drop-shadow-2xl">✨</span>
            </div>
            <p className="text-sm text-slate-400 font-bold">Coming Soon</p>
          </div>
        )}

        {/* Enhanced gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
      </div>

      {/* Card Info with glass effect */}
      <div className="p-5 space-y-3 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-xl relative z-10">
        <h3 className="font-black text-lg line-clamp-2 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300 leading-tight min-h-[3rem]">
          {card.name}
        </h3>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 font-black border-2 border-blue-500/30 backdrop-blur-sm shadow-lg shadow-blue-500/20">
            {card.setCode}
          </span>
          {card.cardNumber && (
            <span className="text-slate-400 font-mono font-bold text-sm">
              #{card.cardNumber}
            </span>
          )}
        </div>

        <p className="text-sm text-slate-400 line-clamp-1 font-semibold">{card.setName}</p>

        {card.rarity && (
          <div className="pt-2">
            <span className={`inline-block px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${getRarityColor(card.rarity)}`}>
              {card.rarity}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
