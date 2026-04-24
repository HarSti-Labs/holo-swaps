"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionApi } from "@/lib/api/collection";
import { searchCards } from "@/lib/api/cards";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/hooks/useAuth";
import {
  Plus, Search, Filter, Grid3x3, List, Trash2, Edit2,
  ArrowLeftRight, X, Star, BookMarked, Heart, CheckSquare, Square, Tag, Lock, Trophy,
} from "lucide-react";
import { Card as CardType, CollectionItem, CardCondition, WantItem, WantPriority } from "@/types";
import { CONDITION_LABELS } from "@/types";
import { ListingModal } from "@/components/listings/ListingModal";

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
  const [collectionSelectMode, setCollectionSelectMode] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [isBulkCollectionLoading, setIsBulkCollectionLoading] = useState(false);

  // ── Want list state ───────────────────────────────────────────────
  const [showAddWantDialog, setShowAddWantDialog] = useState(false);
  const [editingWant, setEditingWant] = useState<WantItem | null>(null);
  const [wantViewMode, setWantViewMode] = useState<"grid" | "list">("list");
  const [showWantFilters, setShowWantFilters] = useState(false);
  const [filterWantPriorities, setFilterWantPriorities] = useState<WantPriority[]>([]);
  const [filterWantCondition, setFilterWantCondition] = useState<CardCondition | "">("");
  const [filterWantSet, setFilterWantSet] = useState("");
  const [wantSelectMode, setWantSelectMode] = useState(false);
  const [selectedWantIds, setSelectedWantIds] = useState<Set<string>>(new Set());
  const [isBulkWantLoading, setIsBulkWantLoading] = useState(false);

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

  // ── Listing modal state ───────────────────────────────────────────
  const [listingModalItem, setListingModalItem] = useState<CollectionItem | null>(null);

  // ── Mutations ─────────────────────────────────────────────────────
  const toggleTradeMutation = useMutation({
    mutationFn: ({ itemId, availableForTrade }: { itemId: string; availableForTrade: boolean }) =>
      collectionApi.updateCollectionItem(itemId, {
        status: availableForTrade ? "AVAILABLE" : "UNAVAILABLE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myCollection"] }),
  });

  const handleToggleListing = (item: CollectionItem) => {
    setListingModalItem(item);
  };

  const handleListingSave = async (askingPrice: number | null, description: string) => {
    if (!listingModalItem) return;
    await collectionApi.toggleListing(listingModalItem.id, true, description, askingPrice ?? undefined);
    queryClient.invalidateQueries({ queryKey: ["myCollection"] });
    setListingModalItem(null);
  };

  const handleListingUnlist = async () => {
    if (!listingModalItem) return;
    await collectionApi.toggleListing(listingModalItem.id, false);
    queryClient.invalidateQueries({ queryKey: ["myCollection"] });
    setListingModalItem(null);
  };

  const removeWantMutation = useMutation({
    mutationFn: (wantId: string) => collectionApi.removeFromWants(wantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myWants"] }),
  });

  const updateWantMutation = useMutation({
    mutationFn: ({ wantId, data }: { wantId: string; data: { priority: WantPriority; maxCondition: CardCondition; notes: string } }) =>
      collectionApi.updateWant(wantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myWants"] });
      setEditingWant(null);
    },
  });

  const handleToggleTrade = (item: CollectionItem) => {
    toggleTradeMutation.mutate({ itemId: item.id, availableForTrade: item.status !== "AVAILABLE" });
  };

  // ── Collection selection helpers ──────────────────────────────────
  const toggleCollectionSelect = (id: string) => {
    setSelectedCollectionIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllCollection = () => {
    if (selectedCollectionIds.size === filteredCollection.length) {
      setSelectedCollectionIds(new Set());
    } else {
      setSelectedCollectionIds(new Set(filteredCollection.map((i) => i.id)));
    }
  };

  const exitCollectionSelect = () => {
    setCollectionSelectMode(false);
    setSelectedCollectionIds(new Set());
  };

  const bulkSetTradeCollection = async (available: boolean) => {
    setIsBulkCollectionLoading(true);
    try {
      await Promise.all(
        [...selectedCollectionIds].map((id) =>
          collectionApi.updateCollectionItem(id, { status: available ? "AVAILABLE" : "UNAVAILABLE" })
        )
      );
      await queryClient.invalidateQueries({ queryKey: ["myCollection"] });
      exitCollectionSelect();
    } finally {
      setIsBulkCollectionLoading(false);
    }
  };

  const bulkDeleteCollection = async () => {
    if (!confirm(`Delete ${selectedCollectionIds.size} card(s)? This cannot be undone.`)) return;
    setIsBulkCollectionLoading(true);
    try {
      await Promise.all([...selectedCollectionIds].map((id) => collectionApi.removeFromCollection(id)));
      await queryClient.invalidateQueries({ queryKey: ["myCollection"] });
      exitCollectionSelect();
    } finally {
      setIsBulkCollectionLoading(false);
    }
  };

  // ── Want selection helpers ────────────────────────────────────────
  const toggleWantSelect = (id: string) => {
    setSelectedWantIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllWants = () => {
    if (selectedWantIds.size === filteredWants.length) {
      setSelectedWantIds(new Set());
    } else {
      setSelectedWantIds(new Set(filteredWants.map((w) => w.id)));
    }
  };

  const exitWantSelect = () => {
    setWantSelectMode(false);
    setSelectedWantIds(new Set());
  };

  const bulkUpdateWants = async (data: { priority?: WantPriority; maxCondition?: CardCondition }) => {
    setIsBulkWantLoading(true);
    try {
      await Promise.all([...selectedWantIds].map((id) => collectionApi.updateWant(id, data)));
      await queryClient.invalidateQueries({ queryKey: ["myWants"] });
      exitWantSelect();
    } finally {
      setIsBulkWantLoading(false);
    }
  };

  const bulkDeleteWants = async () => {
    if (!confirm(`Remove ${selectedWantIds.size} item(s) from your want list?`)) return;
    setIsBulkWantLoading(true);
    try {
      await Promise.all([...selectedWantIds].map((id) => collectionApi.removeFromWants(id)));
      await queryClient.invalidateQueries({ queryKey: ["myWants"] });
      exitWantSelect();
    } finally {
      setIsBulkWantLoading(false);
    }
  };

  // ── Card counts (how many copies of each card) ────────────────────
  const cardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of collection) {
      counts[item.card.id] = (counts[item.card.id] ?? 0) + 1;
    }
    return counts;
  }, [collection]);

  // ── Set catalog (for totalCards per set) ─────────────────────────
  const { data: setsData } = useQuery({
    queryKey: ["cardSets"],
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ setCode: string; name: string; totalCards: number | null }> }>("/sets");
      return res.data.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Map setName -> totalCards from catalog
  const setTotalCards = useMemo(() => {
    const map: Record<string, number | null> = {};
    if (setsData) {
      for (const s of setsData) map[s.name] = s.totalCards ?? null;
    }
    return map;
  }, [setsData]);

  // Unique card IDs owned per setName (ignores quantity duplicates)
  const ownedUniquePerSet = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const item of collection) {
      if (!map[item.card.setName]) map[item.card.setName] = new Set();
      map[item.card.setName].add(item.card.id);
    }
    return map;
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

  // ── Want list filters ─────────────────────────────────────────────
  const availableWantSets = useMemo(
    () => [...new Set(wants.map((w) => w.card.setName))].sort(),
    [wants]
  );

  const wantActiveFilterCount = [
    filterWantPriorities.length > 0,
    filterWantCondition !== "",
    filterWantSet !== "",
  ].filter(Boolean).length;

  const filteredWants = useMemo(() => {
    return wants.filter((w) => {
      if (filterWantPriorities.length > 0 && !filterWantPriorities.includes(w.priority)) return false;
      if (filterWantCondition && w.maxCondition !== filterWantCondition) return false;
      if (filterWantSet && w.card.setName !== filterWantSet) return false;
      return true;
    });
  }, [wants, filterWantPriorities, filterWantCondition, filterWantSet]);

  const clearWantFilters = () => {
    setFilterWantPriorities([]);
    setFilterWantCondition("");
    setFilterWantSet("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">

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
                <span className="text-slate-400">·</span>
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
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all ${
              activeTab === "collection"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookMarked size={16} />
            Collection
            <span className={`px-1.5 py-0.5 rounded-md text-base font-bold ${activeTab === "collection" ? "bg-white/20" : "bg-slate-700"}`}>
              {collection.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("wants")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all ${
              activeTab === "wants"
                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Heart size={16} />
            Want List
            <span className={`px-1.5 py-0.5 rounded-md text-base font-bold ${activeTab === "wants" ? "bg-white/20" : "bg-slate-700"}`}>
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
                <button
                  onClick={() => { setCollectionSelectMode(!collectionSelectMode); setSelectedCollectionIds(new Set()); }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors text-base font-bold ${
                    collectionSelectMode
                      ? "bg-blue-600/20 border-blue-500 text-blue-300"
                      : "bg-slate-800/50 border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <CheckSquare size={18} />
                  Select
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
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-base font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Collection bulk action bar */}
            {collectionSelectMode && (
              <div className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-slate-900/90 border-2 border-blue-500/50 rounded-2xl relative z-10">
                <button onClick={toggleSelectAllCollection} className="text-base font-bold text-blue-400 hover:text-blue-300 transition-colors">
                  {selectedCollectionIds.size === filteredCollection.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-slate-400">|</span>
                <span className="text-base text-slate-400">
                  {selectedCollectionIds.size} selected
                </span>
                {selectedCollectionIds.size > 0 && (
                  <>
                    <span className="text-slate-400">|</span>
                    <button
                      onClick={() => bulkSetTradeCollection(true)}
                      disabled={isBulkCollectionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-600/50 text-green-400 text-base font-bold hover:bg-green-600/30 disabled:opacity-50 transition-colors"
                    >
                      <ArrowLeftRight size={14} />
                      Mark Available
                    </button>
                    <button
                      onClick={() => bulkSetTradeCollection(false)}
                      disabled={isBulkCollectionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-300 text-base font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      <ArrowLeftRight size={14} />
                      Mark Unavailable
                    </button>
                    <button
                      onClick={bulkDeleteCollection}
                      disabled={isBulkCollectionLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-600/50 text-red-400 text-base font-bold hover:bg-red-600/30 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </>
                )}
                <button onClick={exitCollectionSelect} className="ml-auto text-base text-slate-400 hover:text-slate-300 transition-colors">
                  Cancel
                </button>
              </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
              <div className="mb-6 p-6 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-2xl relative z-10 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">Filter Cards</h3>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="flex items-center gap-1 text-base text-blue-400 hover:text-blue-300">
                      <X size={14} />
                      Clear all
                    </button>
                  )}
                </div>

                <div>
                  <p className="text-base font-bold text-slate-400 uppercase tracking-wide mb-2">Quick Filters</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterTradeOnly(!filterTradeOnly)}
                      className={`px-3 py-1.5 rounded-lg text-base font-bold border-2 transition-colors ${filterTradeOnly ? "bg-green-500/20 text-green-300 border-green-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
                    >
                      Available for Trade
                    </button>
                    <button
                      onClick={() => setFilterFoil(filterFoil === true ? null : true)}
                      className={`px-3 py-1.5 rounded-lg text-base font-bold border-2 transition-colors ${filterFoil === true ? "bg-yellow-500/20 text-yellow-300 border-yellow-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
                    >
                      Foil
                    </button>
                    <button
                      onClick={() => setFilterFirstEdition(filterFirstEdition === true ? null : true)}
                      className={`px-3 py-1.5 rounded-lg text-base font-bold border-2 transition-colors ${filterFirstEdition === true ? "bg-purple-500/20 text-purple-300 border-purple-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
                    >
                      1st Edition
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-base font-bold text-slate-400 uppercase tracking-wide mb-2">Condition</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(CONDITION_LABELS) as [CardCondition, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setFilterConditions((prev) => prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value])}
                        className={`px-3 py-1.5 rounded-lg text-base font-bold border-2 transition-colors ${filterConditions.includes(value) ? "bg-blue-500/20 text-blue-300 border-blue-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {availableSets.length > 1 && (
                  <div>
                    <p className="text-base font-bold text-slate-400 uppercase tracking-wide mb-2">Set</p>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                      {availableSets.map((setName) => {
                        const owned = ownedUniquePerSet[setName]?.size ?? 0;
                        const total = setTotalCards[setName] ?? null;
                        const isComplete = total !== null && owned >= total;
                        const isActive = filterSet === setName;
                        return (
                          <button
                            key={setName}
                            onClick={() => setFilterSet(isActive ? "" : setName)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-base font-medium transition-colors ${
                              isActive
                                ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            {isComplete && <Trophy size={11} className="text-yellow-400 flex-shrink-0" />}
                            <span className="truncate max-w-[160px]">{setName}</span>
                            <span className={`text-base flex-shrink-0 ${isComplete ? "text-yellow-400 font-bold" : "text-slate-400"}`}>
                              {total !== null ? `${owned}/${total}` : `${owned}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Set completion banner */}
            {filterSet && (() => {
              const owned = ownedUniquePerSet[filterSet]?.size ?? 0;
              const total = setTotalCards[filterSet] ?? null;
              const isComplete = total !== null && owned >= total;
              const pct = total ? Math.round((owned / total) * 100) : null;
              return (
                <div className={`rounded-2xl border-2 p-4 ${isComplete ? "border-yellow-500/50 bg-yellow-500/10" : "border-slate-700 bg-slate-900/50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isComplete && <Trophy size={16} className="text-yellow-400" />}
                      <span className="font-semibold text-white text-base">{filterSet}</span>
                      {isComplete && <span className="text-base font-bold text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-500/40">Complete Set!</span>}
                    </div>
                    <span className="text-base font-bold text-white">
                      {total !== null ? `${owned} / ${total} cards` : `${owned} cards`}
                    </span>
                  </div>
                  {total !== null && (
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${isComplete ? "bg-yellow-400" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {total !== null && !isComplete && (
                    <p className="text-base text-slate-400 mt-1.5">{pct}% complete · {total - owned} card{total - owned !== 1 ? "s" : ""} missing</p>
                  )}
                </div>
              );
            })()}

            <div className="mb-6" />

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
                    count={item.quantity ?? 1}
                    onEdit={() => !collectionSelectMode && setEditingItem(item)}
                    onToggleTrade={() => handleToggleTrade(item)}
                    onToggleListing={() => handleToggleListing(item)}
                    selectMode={collectionSelectMode}
                    selected={selectedCollectionIds.has(item.id)}
                    onToggleSelect={() => toggleCollectionSelect(item.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── WANT LIST TAB ── */}
        {activeTab === "wants" && (
          <>
            {/* View Toggle & Filters */}
            <div className="mb-4 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWantViewMode("grid")}
                  className={`p-3 rounded-xl transition-all ${
                    wantViewMode === "grid"
                      ? "bg-pink-600 text-white shadow-lg shadow-pink-500/50"
                      : "bg-slate-800/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <Grid3x3 size={20} />
                </button>
                <button
                  onClick={() => setWantViewMode("list")}
                  className={`p-3 rounded-xl transition-all ${
                    wantViewMode === "list"
                      ? "bg-pink-600 text-white shadow-lg shadow-pink-500/50"
                      : "bg-slate-800/50 text-slate-400 hover:text-white"
                  }`}
                >
                  <List size={20} />
                </button>
                <button
                  onClick={() => { setWantSelectMode(!wantSelectMode); setSelectedWantIds(new Set()); }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors text-base font-bold ${
                    wantSelectMode
                      ? "bg-pink-600/20 border-pink-500 text-pink-300"
                      : "bg-slate-800/50 border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <CheckSquare size={18} />
                  Select
                </button>
              </div>

              <button
                onClick={() => setShowWantFilters(!showWantFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                  showWantFilters || wantActiveFilterCount > 0
                    ? "bg-pink-600/20 border-pink-500 text-pink-300"
                    : "bg-slate-800/50 border-transparent text-white hover:bg-slate-700/50"
                }`}
              >
                <Filter size={18} />
                Filters
                {wantActiveFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-base font-bold flex items-center justify-center">
                    {wantActiveFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Want list bulk action bar */}
            {wantSelectMode && (
              <div className="mb-4 p-4 bg-slate-900/90 border-2 border-pink-500/50 rounded-2xl relative z-10 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={toggleSelectAllWants} className="text-base font-bold text-pink-400 hover:text-pink-300 transition-colors">
                    {selectedWantIds.size === filteredWants.length ? "Deselect All" : "Select All"}
                  </button>
                  <span className="text-slate-400">|</span>
                  <span className="text-base text-slate-400">{selectedWantIds.size} selected</span>
                  {selectedWantIds.size > 0 && (
                    <button
                      onClick={bulkDeleteWants}
                      disabled={isBulkWantLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-600/50 text-red-400 text-base font-bold hover:bg-red-600/30 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                  <button onClick={exitWantSelect} className="ml-auto text-base text-slate-400 hover:text-slate-300 transition-colors">
                    Cancel
                  </button>
                </div>

                {selectedWantIds.size > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                    <span className="text-base text-slate-400 self-center mr-1">Set priority:</span>
                    {(["HIGH", "MEDIUM", "LOW"] as WantPriority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => bulkUpdateWants({ priority: p })}
                        disabled={isBulkWantLoading}
                        className={`px-3 py-1 rounded-lg text-base font-bold border-2 disabled:opacity-50 transition-colors ${PRIORITY_COLORS[p]}`}
                      >
                        {p}
                      </button>
                    ))}
                    <span className="text-slate-400 self-center mx-1">|</span>
                    <span className="text-base text-slate-400 self-center mr-1">Set max condition:</span>
                    <select
                      onChange={(e) => e.target.value && bulkUpdateWants({ maxCondition: e.target.value as CardCondition })}
                      disabled={isBulkWantLoading}
                      defaultValue=""
                      className="px-3 py-1 rounded-lg border-2 border-slate-700 bg-slate-950/50 text-white text-base focus:border-pink-500 focus:outline-none disabled:opacity-50"
                    >
                      <option value="" disabled>Pick condition…</option>
                      {(Object.entries(CONDITION_LABELS) as [CardCondition, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Filter Panel */}
            {showWantFilters && (
              <div className="mb-6 p-6 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 rounded-2xl relative z-10 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">Filter Want List</h3>
                  {wantActiveFilterCount > 0 && (
                    <button onClick={clearWantFilters} className="flex items-center gap-1 text-base text-pink-400 hover:text-pink-300">
                      <X size={14} />
                      Clear all
                    </button>
                  )}
                </div>

                <div>
                  <p className="text-base font-bold text-slate-400 uppercase tracking-wide mb-2">Priority</p>
                  <div className="flex flex-wrap gap-2">
                    {(["HIGH", "MEDIUM", "LOW"] as WantPriority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setFilterWantPriorities((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                        className={`px-3 py-1.5 rounded-lg text-base font-bold border-2 transition-colors ${
                          filterWantPriorities.includes(p)
                            ? PRIORITY_COLORS[p]
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-base font-bold text-slate-400 uppercase tracking-wide mb-2">Max Condition</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(CONDITION_LABELS) as [CardCondition, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setFilterWantCondition(filterWantCondition === value ? "" : value)}
                        className={`px-3 py-1.5 rounded-lg text-base font-bold border-2 transition-colors ${
                          filterWantCondition === value
                            ? "bg-pink-500/20 text-pink-300 border-pink-500"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {availableWantSets.length > 1 && (
                  <div>
                    <p className="text-base font-bold text-slate-400 uppercase tracking-wide mb-2">Set</p>
                    <select
                      value={filterWantSet}
                      onChange={(e) => setFilterWantSet(e.target.value)}
                      className="px-4 py-2 rounded-xl border-2 border-slate-700 bg-slate-950/50 text-white focus:border-pink-500 focus:outline-none"
                    >
                      <option value="">All Sets</option>
                      {availableWantSets.map((set) => <option key={set} value={set}>{set}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

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

            {!wantsLoading && wants.length > 0 && filteredWants.length === 0 && (
              <div className="text-center py-20">
                <p className="text-slate-400 text-lg mb-4">No cards match your filters.</p>
                <button onClick={clearWantFilters} className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors">
                  Clear filters
                </button>
              </div>
            )}

            {!wantsLoading && filteredWants.length > 0 && (
              wantViewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {filteredWants.map((want) => (
                    <WantCard
                      key={want.id}
                      want={want}
                      viewMode="grid"
                      onEdit={() => !wantSelectMode && setEditingWant(want)}
                      onRemove={() => removeWantMutation.mutate(want.id)}
                      selectMode={wantSelectMode}
                      selected={selectedWantIds.has(want.id)}
                      onToggleSelect={() => toggleWantSelect(want.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWants.map((want) => (
                    <WantCard
                      key={want.id}
                      want={want}
                      viewMode="list"
                      onEdit={() => !wantSelectMode && setEditingWant(want)}
                      onRemove={() => removeWantMutation.mutate(want.id)}
                      selectMode={wantSelectMode}
                      selected={selectedWantIds.has(want.id)}
                      onToggleSelect={() => toggleWantSelect(want.id)}
                    />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </main>

      {showAddDialog && <AddCardDialog onClose={() => setShowAddDialog(false)} />}
      {editingItem && <EditCardDialog item={editingItem} onClose={() => setEditingItem(null)} />}
      {showAddWantDialog && <AddWantDialog onClose={() => setShowAddWantDialog(false)} />}
      {editingWant && (
        <EditWantDialog
          want={editingWant}
          onClose={() => setEditingWant(null)}
          onSave={(data) => updateWantMutation.mutate({ wantId: editingWant.id, data })}
          isSaving={updateWantMutation.isPending}
        />
      )}
      {listingModalItem && (
        <ListingModal
          isOpen={true}
          onClose={() => setListingModalItem(null)}
          item={listingModalItem}
          onSave={handleListingSave}
          onUnlist={handleListingUnlist}
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
  onToggleListing,
  selectMode,
  selected,
  onToggleSelect,
}: {
  item: CollectionItem;
  viewMode: "grid" | "list";
  count: number;
  onEdit: () => void;
  onToggleTrade: () => void;
  onToggleListing: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  if (viewMode === "list") {
    return (
      <div
        onClick={selectMode ? onToggleSelect : undefined}
        className={`bg-slate-900/80 backdrop-blur-xl border-2 rounded-2xl p-4 transition-all ${
          selectMode ? "cursor-pointer" : ""
        } ${selected ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-blue-500/50"}`}
      >
        {selectMode && (
          <div className="flex items-center gap-3 mb-3">
            {selected ? <CheckSquare size={18} className="text-blue-400 flex-shrink-0" /> : <Square size={18} className="text-slate-400 flex-shrink-0" />}
          </div>
        )}
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
              <p className="text-base text-slate-400">{item.card.setName}</p>
            </div>
            <div className="text-center">
              <p className="text-base text-slate-400 uppercase tracking-wide mb-1">Set Code</p>
              <p className="text-base text-white font-mono">{item.card.setCode}</p>
            </div>
            <div className="text-center">
              <p className="text-base text-slate-400 uppercase tracking-wide mb-1">Condition</p>
              <span className="inline-block px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold">
                {CONDITION_LABELS[item.condition]}
              </span>
            </div>
            <div className="text-center">
              <p className="text-base text-slate-400 uppercase tracking-wide mb-1">Attributes</p>
              <div className="flex justify-center gap-2">
                {item.isFoil && <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-bold">FOIL</span>}
                {item.isFirstEdition && <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold">1ST ED</span>}
              </div>
            </div>
          </div>
          {!selectMode && (
            item.status === "IN_TRADE" ? (
              <div className="ml-4 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                  <Lock size={12} />
                  In Trade
                </span>
              </div>
            ) : (
              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={onToggleTrade}
                  title={item.status === "AVAILABLE" ? "Remove from trade" : "Mark as available for trade"}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    item.status === "AVAILABLE"
                      ? "bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  <ArrowLeftRight size={18} />
                </button>
                <button
                  onClick={onToggleListing}
                  title={item.isOpenListing ? "Remove from listings" : "List publicly for offers"}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    item.isOpenListing
                      ? "bg-teal-500/20 border-teal-500 text-teal-400 hover:bg-teal-500/30"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Tag size={18} />
                </button>
                {item.isOpenListing && item.askingValueOverride != null && (
                  <span className="text-base font-semibold text-teal-400">${item.askingValueOverride.toFixed(2)}</span>
                )}
                <button onClick={onEdit} className="p-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                  <Edit2 size={18} />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={selectMode ? onToggleSelect : undefined}
      className={`group relative bg-slate-900/50 backdrop-blur-sm border-2 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col ${
        selectMode ? "cursor-pointer" : "hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 hover:-translate-y-2 duration-500"
      } ${selected ? "border-blue-500 shadow-lg shadow-blue-500/30" : "border-slate-700/50 hover:border-blue-500/70"}`}
    >
      {/* IN_TRADE lock overlay */}
      {item.status === "IN_TRADE" && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-3xl">
          <Lock className="h-8 w-8 text-amber-400 mb-2" />
          <span className="text-amber-400 text-base font-bold">In Trade</span>
        </div>
      )}

      {/* Selection checkbox */}
      {selectMode && (
        <div className="absolute top-2 left-2 z-20">
          {selected
            ? <CheckSquare size={22} className="text-blue-400 drop-shadow-lg" />
            : <Square size={22} className="text-slate-400 drop-shadow-lg" />}
        </div>
      )}
      <div onClick={!selectMode ? onEdit : undefined} className={`flex-1 flex flex-col${!selectMode ? " cursor-pointer" : ""}`}>
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
              <p className="text-base text-slate-400 font-semibold">No Image</p>
            </div>
          )}
        </div>
        <div className="p-4 space-y-2 bg-gradient-to-b from-slate-900/90 to-slate-950/90">
          <h3 className="font-bold text-white line-clamp-2 min-h-[2.5rem]">{item.card.name}</h3>
          <p className="text-base text-slate-400">{item.card.setName}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold">{CONDITION_LABELS[item.condition]}</span>
            {item.isFoil && <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-bold">FOIL</span>}
            {item.isFirstEdition && <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold">1ST ED</span>}
          </div>
        </div>
      </div>
      {!selectMode && (
        item.status === "IN_TRADE" ? (
          <div className="border-t-2 border-amber-500/30 bg-amber-500/10 py-2 text-center text-base font-bold text-amber-400 flex items-center justify-center gap-1.5">
            <Lock size={11} />
            In Active Trade
          </div>
        ) : (
          <div className="flex border-t-2 border-slate-700/50">
            <button
              onClick={onToggleTrade}
              title={item.status === "AVAILABLE" ? "Remove from trade" : "Mark as available for trade"}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-base font-bold transition-colors ${
                item.status === "AVAILABLE"
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-slate-900/90 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              <ArrowLeftRight size={12} />
              {item.status === "AVAILABLE" ? "Trading" : "Trade"}
            </button>
            <button
              onClick={onToggleListing}
              title={item.isOpenListing ? "Remove from listings" : "List publicly for offers"}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-base font-bold border-l-2 border-slate-700/50 transition-colors ${
                item.isOpenListing
                  ? "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"
                  : "bg-slate-900/90 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              <Tag size={12} />
              {item.isOpenListing
                ? item.askingValueOverride != null
                  ? `$${item.askingValueOverride.toFixed(2)}`
                  : "Listed"
                : "List"}
            </button>
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Want list card
// ─────────────────────────────────────────────────────────────────────────────

function WantCard({ want, viewMode, onEdit, onRemove, selectMode = false, selected = false, onToggleSelect }: {
  want: WantItem;
  viewMode: "grid" | "list";
  onEdit: () => void;
  onRemove: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  if (viewMode === "grid") {
    return (
      <div
        onClick={selectMode ? onToggleSelect : undefined}
        className={`group relative bg-slate-900/50 backdrop-blur-sm border-2 rounded-3xl overflow-hidden transition-all duration-300 ${
          selectMode ? "cursor-pointer" : "hover:shadow-2xl hover:shadow-pink-500/30 hover:scale-105 hover:-translate-y-2 duration-500"
        } ${selected ? "border-pink-500 shadow-lg shadow-pink-500/30" : "border-slate-700/50 hover:border-pink-500/70"}`}
      >
        <div className="aspect-[2/3] bg-gradient-to-br from-pink-950 via-purple-950 to-slate-950 flex items-center justify-center relative">
          {selectMode ? (
            <div className="absolute top-2 left-2 z-20">
              {selected ? <CheckSquare size={22} className="text-pink-400 drop-shadow-lg" /> : <Square size={22} className="text-slate-400 drop-shadow-lg" />}
            </div>
          ) : (
            <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-xs font-bold border ${PRIORITY_COLORS[want.priority]}`}>
              {want.priority}
            </span>
          )}
          {want.card.imageUrl ? (
            <img src={want.card.imageUrl} alt={want.card.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500/40 via-purple-500/40 to-blue-500/40 flex items-center justify-center border-4 border-pink-400/40">
                <span className="text-5xl">🃏</span>
              </div>
              <p className="text-base text-slate-400 font-semibold">No Image</p>
            </div>
          )}
        </div>
        <div onClick={!selectMode ? onEdit : undefined} className={`p-4 space-y-2 bg-gradient-to-b from-slate-900/90 to-slate-950/90 ${!selectMode ? "cursor-pointer" : ""}`}>
          <h3 className="font-bold text-white line-clamp-2 min-h-[2.5rem]">{want.card.name}</h3>
          <p className="text-base text-slate-400">{want.card.setName}</p>
          <span className="inline-block px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold">
            Max: {CONDITION_LABELS[want.maxCondition]}
          </span>
          {want.notes && <p className="text-base text-slate-400 truncate">{want.notes}</p>}
        </div>
        {!selectMode && (
          <div className="flex border-t-2 border-slate-700/50">
            <button onClick={onEdit} className="flex-1 py-2 flex items-center justify-center gap-1.5 text-base font-bold bg-slate-900/90 text-pink-400 hover:bg-pink-600/20 transition-colors">
              <Edit2 size={12} />
              Edit
            </button>
            <button onClick={onRemove} className="flex-1 py-2 flex items-center justify-center gap-1.5 text-base font-bold bg-slate-900/90 text-red-400 hover:bg-red-600/20 border-l-2 border-slate-700/50 transition-colors">
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={selectMode ? onToggleSelect : undefined}
      className={`bg-slate-900/80 backdrop-blur-xl border-2 rounded-2xl p-4 transition-all ${
        selectMode ? "cursor-pointer" : "hover:border-pink-500/50"
      } ${selected ? "border-pink-500 bg-pink-500/5" : "border-slate-700"}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {selectMode && (
            <div className="flex-shrink-0">
              {selected ? <CheckSquare size={18} className="text-pink-400" /> : <Square size={18} className="text-slate-400" />}
            </div>
          )}
          <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-pink-950 via-purple-950 to-slate-950 flex items-center justify-center flex-shrink-0 border border-slate-700">
            {want.card.imageUrl ? (
              <img src={want.card.imageUrl} alt={want.card.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <span className="text-xl">🃏</span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-white truncate">{want.card.name}</h3>
            <p className="text-base text-slate-400">{want.card.setName} · #{want.card.cardNumber}</p>
            {want.notes && <p className="text-base text-slate-400 mt-1 truncate">{want.notes}</p>}
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
          {!selectMode && (
            <>
              <button onClick={onEdit} title="Edit want" className="p-2.5 rounded-lg bg-pink-600/20 border border-pink-600/50 text-pink-400 hover:bg-pink-600/30 transition-colors">
                <Edit2 size={16} />
              </button>
              <button onClick={onRemove} title="Remove from want list" className="p-2.5 rounded-lg bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30 transition-colors">
                <Trash2 size={16} />
              </button>
            </>
          )}
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
// Edit Want dialog
// ─────────────────────────────────────────────────────────────────────────────

function EditWantDialog({
  want,
  onClose,
  onSave,
  isSaving,
}: {
  want: WantItem;
  onClose: () => void;
  onSave: (data: { priority: WantPriority; maxCondition: CardCondition; notes: string }) => void;
  isSaving: boolean;
}) {
  const [priority, setPriority] = useState<WantPriority>(want.priority);
  const [maxCondition, setMaxCondition] = useState<CardCondition>(want.maxCondition);
  const [notes, setNotes] = useState(want.notes ?? "");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Edit Want</h2>
            <p className="text-base text-slate-400 mt-0.5">{want.card.name} · {want.card.setName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-base font-medium text-slate-300 mb-2">Priority</label>
            <div className="flex gap-2">
              {(["HIGH", "MEDIUM", "LOW"] as WantPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-lg text-base font-semibold border transition-colors ${
                    priority === p ? PRIORITY_COLORS[p] : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-slate-300 mb-2">Max Acceptable Condition</label>
            <select
              value={maxCondition}
              onChange={(e) => setMaxCondition(e.target.value as CardCondition)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {(Object.entries(CONDITION_LABELS) as [CardCondition, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base font-medium text-slate-300 mb-2">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific details (e.g. 1st edition only, specific language…)"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ priority, maxCondition, notes })}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
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
  const [quantity, setQuantity] = useState(1);

  const { data: searchResults } = useQuery({
    queryKey: ["card-search", searchQuery],
    queryFn: () => searchCards({ q: searchQuery, limit: 20 }),
    enabled: searchQuery.length > 2,
  });

  const addMutation = useMutation({
    mutationFn: (data: { cardId: string; condition: CardCondition; isFoil: boolean; quantity: number }) =>
      collectionApi.addToCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCollection"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Add Card to Collection</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "search" && (
            <div>
              <div className="mb-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search for a card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {searchResults?.data.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => { setSelectedCard(card); setStep("details"); }}
                    className="text-left bg-slate-800/50 rounded-xl p-3 hover:bg-slate-800 transition-colors border border-slate-700 hover:border-blue-500/60"
                  >
                    <div className="aspect-[2/3] bg-gradient-to-br from-blue-950 to-purple-950 rounded-lg mb-2" />
                    <p className="font-semibold text-white text-base line-clamp-2">{card.name}</p>
                    <p className="text-base text-slate-400">{card.setName}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "details" && selectedCard && (
            <div className="space-y-4">
              <button onClick={() => setStep("search")} className="text-base text-blue-400 hover:text-blue-300 transition-colors">← Back to search</button>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="font-semibold text-white">{selectedCard.name}</p>
                <p className="text-base text-slate-400">{selectedCard.setName}</p>
              </div>
              <div>
                <label className="block text-base font-medium text-slate-300 mb-2">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as CardCondition)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" id="foil" checked={isFoil} onChange={(e) => setIsFoil(e.target.checked)} className="w-4 h-4 rounded border border-slate-700 bg-slate-800 text-blue-600" />
                <span className="text-base text-slate-300">Foil / Holo</span>
              </label>
              <div>
                <label className="block text-base font-medium text-slate-300 mb-2">Quantity</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors flex items-center justify-center">−</button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center px-2 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors flex items-center justify-center">+</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "details" && selectedCard && (
          <div className="flex gap-3 p-5 border-t border-slate-700 flex-shrink-0">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors">Cancel</button>
            <button
              onClick={() => addMutation.mutate({ cardId: selectedCard.id, condition, isFoil, quantity })}
              disabled={addMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {addMutation.isPending ? "Adding..." : "Add to Collection"}
            </button>
          </div>
        )}
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Add to Want List</h2>
            {step === "details" && selectedCard && (
              <button onClick={() => setStep("search")} className="text-base text-pink-400 hover:text-pink-300 mt-0.5">← Back to search</button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "search" && (
            <div>
              <div className="mb-5 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search for a card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 text-base"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {searchResults?.data.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => { setSelectedCard(card); setStep("details"); }}
                    className="text-left bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800 transition-colors border border-slate-700 hover:border-pink-500/50"
                  >
                    <div className="aspect-[2/3] bg-slate-700 rounded mb-2" />
                    <p className="font-semibold text-white text-base line-clamp-2">{card.name}</p>
                    <p className="text-base text-slate-400">{card.setName}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "details" && selectedCard && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{selectedCard.name}</p>
                  <p className="text-base text-slate-400 mt-0.5">{selectedCard.setName}</p>
                </div>
              </div>
              <div>
                <label className="block text-base font-medium text-slate-300 mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {(["HIGH", "MEDIUM", "LOW"] as WantPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2.5 rounded-lg text-base font-medium border transition-colors ${
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
                <label className="block text-base font-medium text-slate-300 mb-1.5">Max Acceptable Condition</label>
                <p className="text-base text-slate-400 mb-1.5">The worst condition you'd accept for this card</p>
                <select
                  value={maxCondition}
                  onChange={(e) => setMaxCondition(e.target.value as CardCondition)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 text-base"
                >
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-slate-300 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific details (e.g. 1st edition only, English version)..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 text-base resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>
              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-900/20 border border-red-800/50 text-red-400 text-base">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "details" && selectedCard && (
          <div className="flex gap-3 p-5 border-t border-slate-700 flex-shrink-0">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors text-base">Cancel</button>
            <button
              onClick={() => { setError(null); addMutation.mutate(); }}
              disabled={addMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-semibold transition-colors disabled:opacity-50 text-base"
            >
              {addMutation.isPending ? "Adding..." : "Add to Want List"}
            </button>
          </div>
        )}
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
  const [quantity, setQuantity] = useState(item.quantity ?? 1);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Card</h2>
            <p className="text-base text-slate-400 mt-0.5">{item.card.name} · {item.card.setName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {item.status === "IN_TRADE" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-base">
              <Lock size={16} />
              <span>This card is currently in an active trade. Only quantity can be updated.</span>
            </div>
          )}

          {confirmDelete && (
            <div className="p-4 rounded-lg bg-red-900/20 border border-red-800/50">
              <p className="text-base text-red-300 font-medium mb-3">Remove &quot;{item.card.name}&quot; from your collection?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-base font-medium"
                >
                  Keep it
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors text-base font-medium disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Removing..." : "Yes, remove"}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-base font-medium text-slate-300 mb-1.5">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as CardCondition)}
              disabled={item.status === "IN_TRADE"}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-foil" checked={isFoil} onChange={(e) => setIsFoil(e.target.checked)} disabled={item.status === "IN_TRADE"} className="w-4 h-4 rounded border border-slate-700" />
              <label htmlFor="edit-foil" className="text-base text-slate-300">Foil / Holo</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-first-edition" checked={isFirstEdition} onChange={(e) => setIsFirstEdition(e.target.checked)} disabled={item.status === "IN_TRADE"} className="w-4 h-4 rounded border border-slate-700" />
              <label htmlFor="edit-first-edition" className="text-base text-slate-300">1st Edition</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="edit-trade" checked={availableForTrade} onChange={(e) => setAvailableForTrade(e.target.checked)} disabled={item.status === "IN_TRADE"} className="w-4 h-4 rounded border border-slate-700" />
              <label htmlFor="edit-trade" className="text-base text-slate-300">Available for Trade</label>
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-slate-300 mb-1.5">Quantity</label>
            <p className="text-base text-slate-400 mb-2">How many identical copies of this card you own</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                className="w-16 text-center px-2 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-slate-300 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this card..."
              disabled={item.status === "IN_TRADE"}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none disabled:opacity-40 disabled:cursor-not-allowed"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-700 flex-shrink-0">
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 border border-red-500/60 text-red-400 hover:bg-red-500/10 rounded-lg text-base font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            Remove
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-base">Cancel</button>
            <button
              onClick={() => {
                if (item.status === "IN_TRADE") {
                  updateMutation.mutate({ quantity });
                } else {
                  updateMutation.mutate({ condition, isFoil, isFirstEdition, status: availableForTrade ? "AVAILABLE" : "UNAVAILABLE", notes: notes || undefined, quantity });
                }
              }}
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-base transition-colors"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
