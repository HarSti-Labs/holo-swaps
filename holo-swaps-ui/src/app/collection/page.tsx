"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/shared/Navbar";
import { collectionApi } from "@/lib/api/collection";
import { searchCards } from "@/lib/api/cards";
import { useAuthStore } from "@/lib/hooks/useAuth";
import {
  Plus, Search, Filter, Grid3x3, List, Trash2, Edit2,
  ArrowLeftRight, X, Star, BookMarked, Heart,
} from "lucide-react";
import { Card as CardType, CollectionItem, CardCondition, WantItem, WantPriority } from "@/types";
import { CONDITION_LABELS } from "@/types";

const PRIORITY_LABELS: Record<WantPriority, string> = {
  HIGH: "High Priority",
  MEDIUM: "Medium Priority",
  LOW: "Low Priority",
};

const PRIORITY_COLORS: Record<WantPriority, string> = {
  HIGH: "bg-red-500/20 text-red-300 border-red-500/50",
  MEDIUM: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  LOW: "bg-slate-500/20 text-slate-300 border-slate-500/50",
};

export default function MyCardsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = (searchParams.get("tab") === "wants" ? "wants" : "collection") as "collection" | "wants";

  const setActiveTab = (tab: "collection" | "wants") => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "collection") params.delete("tab");
    else params.set("tab", "wants");
    router.replace(`/collection${params.size > 0 ? `?${params}` : ""}`);
  };

  // ── Collection state ──────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterTradeOnly, setFilterTradeOnly] = useState(false);
  const [filterConditions, setFilterConditions] = useState<CardCondition[]>([]);
  const [filterFoil, setFilterFoil] = useState<boolean | null>(null);
  const [filterFirstEdition, setFilterFirstEdition] = useState<boolean | null>(null);
  const [filterSet, setFilterSet] = useState("");

  // ── Want list state ───────────────────────────────────────────────
  const [showAddWantDialog, setShowAddWantDialog] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────
  const { data: collectionData, isLoading: collectionLoading } = useQuery({
    queryKey: ["myCollection"],
    queryFn: () => collectionApi.getMyCollection(1, 200),
    enabled: !!user,
  });

  const { data: wantsData, isLoading: wantsLoading } = useQuery({
    queryKey: ["myWants"],
    queryFn: () => collectionApi.getWants(),
    enabled: !!user,
  });

  const collection = collectionData?.data ?? [];
  const wants = wantsData ?? [];

  // ── Mutations ─────────────────────────────────────────────────────
  const toggleTradeMutation = useMutation({
    mutationFn: ({ itemId, availableForTrade }: { itemId: string; availableForTrade: boolean }) =>
      collectionApi.updateCollectionItem(itemId, {
        status: availableForTrade ? "AVAILABLE" : "UNAVAILABLE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myCollection"] }),
  });

  const removeWantMutation = useMutation({
    mutationFn: (wantId: string) => collectionApi.removeFromWants(wantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myWants"] }),
  });

  const handleToggleTrade = (item: CollectionItem) => {
    toggleTradeMutation.mutate({ itemId: item.id, availableForTrade: item.status !== "AVAILABLE" });
  };

  // ── Card counts (how many copies of each card) ────────────────────
  const cardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of collection) {
      counts[item.card.id] = (counts[item.card.id] ?? 0) + 1;
    }
    return counts;
  }, [collection]);

  // ── Collection filters ────────────────────────────────────────────
  const availableSets = useMemo(
    () => [...new Set(collection.map((item) => item.card.setName))].sort(),
    [collection]
  );

  const activeFilterCount = [
    filterTradeOnly,
    filterConditions.length > 0,
    filterFoil !== null,
    filterFirstEdition !== null,
    filterSet !== "",
  ].filter(Boolean).length;

  const filteredCollection = useMemo(() => {
    return collection.filter((item) => {
      if (filterTradeOnly && item.status !== "AVAILABLE") return false;
      if (filterConditions.length > 0 && !filterConditions.includes(item.condition)) return false;
      if (filterFoil !== null && item.isFoil !== filterFoil) return false;
      if (filterFirstEdition !== null && item.isFirstEdition !== filterFirstEdition) return false;
      if (filterSet && item.card.setName !== filterSet) return false;
      return true;
    });
  }, [collection, filterTradeOnly, filterConditions, filterFoil, filterFirstEdition, filterSet]);

  const clearFilters = () => {
    setFilterTradeOnly(false);
    setFilterConditions([]);
    setFilterFoil(null);
    setFilterFirstEdition(null);
    setFilterSet("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 relative">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="font-display text-5xl md:text-6xl font-black mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                My Cards
              </h1>
              <p className="text-xl text-slate-300 flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                  {collection.length} in collection
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 bg-pink-400 rounded-full animate-pulse"></span>
                  {wants.length} wanted
                </span>
              </p>
            </div>

            {activeTab === "collection" ? (
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30"
              >
                <Plus size={24} />
                Add Card
              </button>
            ) : (
              <button
                onClick={() => setShowAddWantDialog(true)}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold hover:from-pink-500 hover:to-purple-500 transition-all shadow-xl shadow-pink-500/30"
              >
                <Plus size={24} />
                Add to Want List
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="relative z-10 flex gap-1 mb-8 bg-slate-900/50 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("collection")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === "collection"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookMarked size={16} />
            Collection
            <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${activeTab === "collection" ? "bg-white/20" : "bg-slate-700"}`}>
              {collection.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("wants")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === "wants"
                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Heart size={16} />
            Want List
            <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${activeTab === "wants" ? "bg-white/20" : "bg-slate-700"}`}>
              {wants.length}
            </span>
          </button>
        </div>

        {/* ── COLLECTION TAB ── */}
        {activeTab === "collection" && (
          <>
            {/* View Toggle & Filters */}
            <div className="mb-4 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3 rounded-xl transition-all ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                      : "bg-slate-800/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <Grid3x3 size={20} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-3 rounded-xl transition-all ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                      : "bg-slate-800/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <List size={20} />
                </button>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                    : "bg-slate-800/50 border-transparent text-white hover:bg-slate-700/50"
                }`}
              >
                <Filter size={18} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mb-6 p-6 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-2xl relative z-10 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">Filter Cards</h3>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                      <X size={14} />
                      Clear all
                    </button>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Quick Filters</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterTradeOnly(!filterTradeOnly)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${filterTradeOnly ? "bg-green-500/20 text-green-300 border-green-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
                    >
                      Available for Trade
                    </button>
                    <button
                      onClick={() => setFilterFoil(filterFoil === true ? null : true)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${filterFoil === true ? "bg-yellow-500/20 text-yellow-300 border-yellow-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
                    >
                      Foil
                    </button>
                    <button
                      onClick={() => setFilterFirstEdition(filterFirstEdition === true ? null : true)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${filterFirstEdition === true ? "bg-purple-500/20 text-purple-300 border-purple-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
                    >
                      1st Edition
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Condition</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(CONDITION_LABELS) as [CardCondition, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setFilterConditions((prev) => prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value])}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${filterConditions.includes(value) ? "bg-blue-500/20 text-blue-300 border-blue-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {availableSets.length > 1 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Set</p>
                    <select
                      value={filterSet}
                      onChange={(e) => setFilterSet(e.target.value)}
                      className="px-4 py-2 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">All Sets</option>
                      {availableSets.map((set) => <option key={set} value={set}>{set}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {collectionLoading && (
              <div className="text-center py-20">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-4 text-slate-400">Loading your collection...</p>
              </div>
            )}

            {!collectionLoading && collection.length === 0 && (
              <div className="text-center py-20">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <span className="text-6xl">📦</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No cards yet</h2>
                <p className="text-slate-400 mb-6">Start building your collection by adding cards!</p>
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30"
                >
                  <Plus size={20} />
                  Add Your First Card
                </button>
              </div>
            )}

            {!collectionLoading && collection.length > 0 && filteredCollection.length === 0 && (
              <div className="text-center py-20">
                <p className="text-slate-400 text-lg mb-4">No cards match your filters.</p>
                <button onClick={clearFilters} className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors">
                  Clear filters
                </button>
              </div>
            )}

            {!collectionLoading && filteredCollection.length > 0 && (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "space-y-4"}>
                {filteredCollection.map((item) => (
                  <CollectionCard
                    key={item.id}
                    item={item}
                    viewMode={viewMode}
                    count={cardCounts[item.card.id] ?? 1}
                    onEdit={() => setEditingItem(item)}
                    onToggleTrade={() => handleToggleTrade(item)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── WANT LIST TAB ── */}
        {activeTab === "wants" && (
          <>
            {wantsLoading && (
              <div className="text-center py-20">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-pink-500 border-r-transparent"></div>
                <p className="mt-4 text-slate-400">Loading your want list...</p>
              </div>
            )}

            {!wantsLoading && wants.length === 0 && (
              <div className="text-center py-20">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                  <span className="text-6xl">✨</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No cards on your want list</h2>
                <p className="text-slate-400 mb-6">Add cards you're looking for and we'll find matching trades!</p>
                <button
                  onClick={() => setShowAddWantDialog(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold hover:from-pink-500 hover:to-purple-500 transition-all shadow-xl shadow-pink-500/30"
                >
                  <Plus size={20} />
                  Add Your First Want
                </button>
              </div>
            )}

            {!wantsLoading && wants.length > 0 && (
              <div className="space-y-3">
                {wants.map((want) => (
                  <WantCard
                    key={want.id}
                    want={want}
                    onRemove={() => removeWantMutation.mutate(want.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showAddDialog && <AddCardDialog onClose={() => setShowAddDialog(false)} />}
      {editingItem && <EditCardDialog item={editingItem} onClose={() => setEditingItem(null)} />}
      {showAddWantDialog && (
        <AddWantDialog
          onClose={() => setShowAddWantDialog(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection card (grid / list)
// ─────────────────────────────────────────────────────────────────────────────

function CollectionCard({
  item,
  viewMode,
  count,
  onEdit,
  onToggleTrade,
}: {
  item: CollectionItem;
  viewMode: "grid" | "list";
  count: number;
  onEdit: () => void;
  onToggleTrade: () => void;
}) {
  if (viewMode === "list") {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-2xl p-4 hover:border-blue-500/50 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex-1 grid grid-cols-5 gap-4 items-center">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">{item.card.name}</h3>
                {count > 1 && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/30 border border-blue-500/50 text-blue-300 text-xs font-black">
                    ×{count}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">{item.card.setName}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Set Code</p>
              <p className="text-sm text-white font-mono">{item.card.setCode}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Condition</p>
              <span className="inline-block px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold">
                {CONDITION_LABELS[item.condition]}
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Attributes</p>
              <div className="flex justify-center gap-2">
                {item.isFoil && <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-bold">FOIL</span>}
                {item.isFirstEdition && <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold">1ST ED</span>}
              </div>
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={onToggleTrade}
              title={item.status === "AVAILABLE" ? "Remove from trade" : "Mark as available for trade"}
              className={`p-3 rounded-lg border-2 transition-colors ${
                item.status === "AVAILABLE"
                  ? "bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30"
                  : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
              }`}
            >
              <ArrowLeftRight size={18} />
            </button>
            <button onClick={onEdit} className="p-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              <Edit2 size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-slate-900/50 backdrop-blur-sm border-2 border-slate-700/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 hover:border-blue-500/70 hover:-translate-y-2 transition-all duration-500">
      <div onClick={onEdit} className="cursor-pointer">
        <div className="aspect-[2/3] bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 flex items-center justify-center relative">
          {count > 1 && (
            <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-blue-500/50 text-blue-300 text-xs font-black leading-none">
              ×{count}
            </div>
          )}
          {item.card.imageUrl ? (
            <img src={item.card.imageUrl} alt={item.card.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/40 to-pink-500/40 flex items-center justify-center border-4 border-blue-400/40">
                <span className="text-5xl">🃏</span>
              </div>
              <p className="text-xs text-slate-400 font-semibold">No Image</p>
            </div>
          )}
        </div>
        <div className="p-4 space-y-2 bg-gradient-to-b from-slate-900/90 to-slate-950/90">
          <h3 className="font-bold text-white line-clamp-2 min-h-[2.5rem]">{item.card.name}</h3>
          <p className="text-xs text-slate-400">{item.card.setName}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold">{CONDITION_LABELS[item.condition]}</span>
            {item.isFoil && <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-bold">FOIL</span>}
            {item.isFirstEdition && <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold">1ST ED</span>}
          </div>
        </div>
      </div>
      <button
        onClick={onToggleTrade}
        title={item.status === "AVAILABLE" ? "Remove from trade" : "Mark as available for trade"}
        className={`w-full py-2 flex items-center justify-center gap-2 text-xs font-bold border-t-2 transition-colors ${
          item.status === "AVAILABLE"
            ? "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30"
            : "bg-slate-900/90 border-slate-700/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
        }`}
      >
        <ArrowLeftRight size={12} />
        {item.status === "AVAILABLE" ? "Available for Trade" : "Mark for Trade"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Want list card
// ─────────────────────────────────────────────────────────────────────────────

function WantCard({ want, onRemove }: { want: WantItem; onRemove: () => void }) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-2xl p-4 hover:border-pink-500/50 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Card image placeholder */}
          <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-pink-950 via-purple-950 to-slate-950 flex items-center justify-center flex-shrink-0 border border-slate-700">
            {want.card.imageUrl ? (
              <img src={want.card.imageUrl} alt={want.card.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <span className="text-xl">🃏</span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-white truncate">{want.card.name}</h3>
            <p className="text-sm text-slate-400">{want.card.setName} · #{want.card.cardNumber}</p>
            {want.notes && <p className="text-xs text-slate-500 mt-1 truncate">{want.notes}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${PRIORITY_COLORS[want.priority]}`}>
              {PRIORITY_LABELS[want.priority]}
            </span>
            <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold">
              Max: {CONDITION_LABELS[want.maxCondition]}
            </span>
          </div>
          <button
            onClick={onRemove}
            title="Remove from want list"
            className="p-2.5 rounded-lg bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Mobile: show badges below */}
      <div className="sm:hidden flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
        <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${PRIORITY_COLORS[want.priority]}`}>
          {PRIORITY_LABELS[want.priority]}
        </span>
        <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold">
          Max: {CONDITION_LABELS[want.maxCondition]}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Card dialog (collection)
// ─────────────────────────────────────────────────────────────────────────────

function AddCardDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [step, setStep] = useState<"search" | "details">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [condition, setCondition] = useState<CardCondition>("NEAR_MINT");
  const [isFoil, setIsFoil] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ["card-search", searchQuery],
    queryFn: () => searchCards({ q: searchQuery, limit: 20 }),
    enabled: searchQuery.length > 2,
  });

  const addMutation = useMutation({
    mutationFn: (data: { cardId: string; condition: CardCondition; isFoil: boolean }) =>
      collectionApi.addToCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCollection"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-3xl font-black text-white mb-6">Add Card to Collection</h2>

        {step === "search" && (
          <div>
            <div className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search for a card..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {searchResults?.data.map((card) => (
                <button
                  key={card.id}
                  onClick={() => { setSelectedCard(card); setStep("details"); }}
                  className="text-left bg-slate-800/50 rounded-xl p-3 hover:bg-slate-700/50 transition-colors border-2 border-transparent hover:border-blue-500/50"
                >
                  <div className="aspect-[2/3] bg-gradient-to-br from-blue-950 to-purple-950 rounded-lg mb-2" />
                  <p className="font-bold text-white text-sm line-clamp-2">{card.name}</p>
                  <p className="text-xs text-slate-400">{card.setName}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "details" && selectedCard && (
          <div>
            <button onClick={() => setStep("search")} className="text-blue-400 hover:text-blue-300 mb-4">← Back to search</button>
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{selectedCard.name}</h3>
              <p className="text-slate-400">{selectedCard.setName}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as CardCondition)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="foil" checked={isFoil} onChange={(e) => setIsFoil(e.target.checked)} className="w-5 h-5 rounded border-2 border-slate-700" />
                <label htmlFor="foil" className="text-white font-bold">Foil / Holo</label>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={onClose} className="flex-1 px-6 py-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors">Cancel</button>
              <button
                onClick={() => addMutation.mutate({ cardId: selectedCard.id, condition, isFoil })}
                disabled={addMutation.isPending}
                className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50"
              >
                {addMutation.isPending ? "Adding..." : "Add to Collection"}
              </button>
            </div>
          </div>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl">×</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Want dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddWantDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"search" | "details">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [maxCondition, setMaxCondition] = useState<CardCondition>("LIGHTLY_PLAYED");
  const [priority, setPriority] = useState<WantPriority>("MEDIUM");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: searchResults } = useQuery({
    queryKey: ["card-search", searchQuery],
    queryFn: () => searchCards({ q: searchQuery, limit: 20 }),
    enabled: searchQuery.length > 2,
  });

  const addMutation = useMutation({
    mutationFn: () => collectionApi.addToWants({ cardId: selectedCard!.id, maxCondition, priority, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWants"] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to add to want list";
      setError(msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-3xl font-black text-white mb-6">Add to Want List</h2>

        {step === "search" && (
          <div>
            <div className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search for a card..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-pink-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {searchResults?.data.map((card) => (
                <button
                  key={card.id}
                  onClick={() => { setSelectedCard(card); setStep("details"); }}
                  className="text-left bg-slate-800/50 rounded-xl p-3 hover:bg-slate-700/50 transition-colors border-2 border-transparent hover:border-pink-500/50"
                >
                  <div className="aspect-[2/3] bg-gradient-to-br from-pink-950 to-purple-950 rounded-lg mb-2" />
                  <p className="font-bold text-white text-sm line-clamp-2">{card.name}</p>
                  <p className="text-xs text-slate-400">{card.setName}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "details" && selectedCard && (
          <div>
            <button onClick={() => setStep("search")} className="text-pink-400 hover:text-pink-300 mb-4">← Back to search</button>
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{selectedCard.name}</h3>
              <p className="text-slate-400">{selectedCard.setName}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2">Priority</label>
                <div className="flex gap-3">
                  {(["HIGH", "MEDIUM", "LOW"] as WantPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                        priority === p
                          ? p === "HIGH" ? "bg-red-500/20 border-red-500 text-red-300"
                            : p === "MEDIUM" ? "bg-yellow-500/20 border-yellow-500 text-yellow-300"
                            : "bg-slate-500/20 border-slate-500 text-slate-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2">Max Acceptable Condition</label>
                <p className="text-xs text-slate-500 mb-2">The worst condition you'd accept for this card</p>
                <select
                  value={maxCondition}
                  onChange={(e) => setMaxCondition(e.target.value as CardCondition)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white focus:border-pink-500 focus:outline-none"
                >
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific details (e.g. 1st edition only, English version)..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-pink-500 focus:outline-none resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={onClose} className="flex-1 px-6 py-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors">Cancel</button>
              <button
                onClick={() => { setError(null); addMutation.mutate(); }}
                disabled={addMutation.isPending}
                className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold hover:from-pink-500 hover:to-purple-500 transition-all shadow-xl shadow-pink-500/30 disabled:opacity-50"
              >
                {addMutation.isPending ? "Adding..." : "Add to Want List"}
              </button>
            </div>
          </div>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl">×</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Card dialog
// ─────────────────────────────────────────────────────────────────────────────

function EditCardDialog({ item, onClose }: { item: CollectionItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [condition, setCondition] = useState<CardCondition>(item.condition);
  const [isFoil, setIsFoil] = useState(item.isFoil || false);
  const [isFirstEdition, setIsFirstEdition] = useState(item.isFirstEdition || false);
  const [availableForTrade, setAvailableForTrade] = useState(item.status === "AVAILABLE");
  const [notes, setNotes] = useState(item.notes || "");

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof collectionApi.updateCollectionItem>[1]) =>
      collectionApi.updateCollectionItem(item.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCollection"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => collectionApi.removeFromCollection(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCollection"] });
      onClose();
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove "${item.card.name}" from your collection?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-3xl font-black text-white mb-2">Edit Card</h2>
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6">
          <h3 className="text-xl font-bold text-white">{item.card.name}</h3>
          <p className="text-slate-400">{item.card.setName}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-white mb-2">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as CardCondition)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white focus:border-blue-500 focus:outline-none"
            >
              {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-foil" checked={isFoil} onChange={(e) => setIsFoil(e.target.checked)} className="w-5 h-5 rounded border-2 border-slate-700" />
              <label htmlFor="edit-foil" className="text-white font-bold">Foil / Holo</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-first-edition" checked={isFirstEdition} onChange={(e) => setIsFirstEdition(e.target.checked)} className="w-5 h-5 rounded border-2 border-slate-700" />
              <label htmlFor="edit-first-edition" className="text-white font-bold">1st Edition</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-trade" checked={availableForTrade} onChange={(e) => setAvailableForTrade(e.target.checked)} className="w-5 h-5 rounded border-2 border-slate-700" />
              <label htmlFor="edit-trade" className="text-white font-bold">Available for Trade</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this card..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-6 py-4 rounded-xl bg-red-600/20 border-2 border-red-600 text-red-400 font-bold hover:bg-red-600/30 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 size={18} />
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </button>
          <div className="flex-1 flex gap-3">
            <button onClick={onClose} className="flex-1 px-6 py-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors">Cancel</button>
            <button
              onClick={() => updateMutation.mutate({ condition, isFoil, isFirstEdition, status: availableForTrade ? "AVAILABLE" : "UNAVAILABLE", notes: notes || undefined })}
              disabled={updateMutation.isPending}
              className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl">×</button>
      </div>
    </div>
  );
}
