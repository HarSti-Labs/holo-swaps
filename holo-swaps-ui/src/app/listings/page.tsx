"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { listingsApi, Listing } from "@/lib/api/listings";
import { TradeProposalModal } from "@/components/trades/TradeProposalModal";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { CONDITION_LABELS, CollectionItem, User } from "@/types";
import {
  Search, Package, Loader2, ChevronLeft, ChevronRight,
  Tag, ArrowLeftRight, ShoppingBag, X, SlidersHorizontal,
  ChevronDown, Sparkles, Star, Shield, Layers,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const GAMES = [
  { key: "", label: "All Games" },
  { key: "POKEMON", label: "Pokémon" },
  { key: "MAGIC_THE_GATHERING", label: "MTG" },
  { key: "ONE_PIECE", label: "One Piece" },
  { key: "YUGIOH", label: "Yu-Gi-Oh" },
  { key: "DIGIMON", label: "Digimon" },
];

const CONDITIONS = [
  { key: "MINT", label: "Mint" },
  { key: "NEAR_MINT", label: "Near Mint" },
  { key: "LIGHTLY_PLAYED", label: "Lightly Played" },
  { key: "MODERATELY_PLAYED", label: "Mod. Played" },
  { key: "HEAVILY_PLAYED", label: "Heavily Played" },
  { key: "DAMAGED", label: "Damaged" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "condition_best", label: "Condition: Best First" },
];

const TIER_STYLES: Record<string, string> = {
  DIAMOND: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  GOLD:    "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  SILVER:  "bg-slate-400/20 text-slate-300 border border-slate-400/30",
  BRONZE:  "bg-orange-700/20 text-orange-400 border border-orange-700/30",
};

const CONDITION_COLORS: Record<string, string> = {
  MINT:               "bg-green-500/20 text-green-400",
  NEAR_MINT:          "bg-emerald-500/20 text-emerald-400",
  LIGHTLY_PLAYED:     "bg-blue-500/20 text-blue-400",
  MODERATELY_PLAYED:  "bg-yellow-500/20 text-yellow-400",
  HEAVILY_PLAYED:     "bg-orange-500/20 text-orange-400",
  DAMAGED:            "bg-red-500/20 text-red-400",
};

function listingToCollectionItem(listing: Listing): CollectionItem {
  return {
    id: listing.id,
    userId: listing.userId,
    cardId: listing.cardId,
    card: listing.card,
    condition: listing.condition,
    isFoil: listing.isFoil,
    isFirstEdition: listing.isFirstEdition,
    language: listing.language,
    photos: listing.media.map((m) => m.url),
    notes: listing.listingDescription,
    status: "AVAILABLE",
    askingValueOverride: listing.askingValueOverride,
    currentMarketValue: listing.currentMarketValue,
    createdAt: listing.updatedAt,
    quantity: 1,
    isOpenListing: true,
    listingDescription: listing.listingDescription,
  };
}

function listingUserToUser(listing: Listing): User {
  return {
    id: listing.user.id,
    username: listing.user.username,
    avatarUrl: listing.user.avatarUrl,
    reputationScore: listing.user.reputationScore,
    email: "",
    bio: null,
    location: null,
    isEmailVerified: true,
    tradeCount: 0,
    stripeAccountVerified: false,
    isAdmin: false,
    emailOnTradeProposed: true,
    emailOnTradeCountered: true,
    emailOnTradeAccepted: true,
    emailOnTradeDeclined: true,
    emailOnTradeCancelled: true,
    emailOnTradeMessage: true,
    createdAt: "",
  };
}

export default function ListingsPage() {
  const { user, isAuthenticated } = useAuthStore();

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [game, setGame] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [condition, setCondition] = useState("");
  const [rarity, setRarity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [foilOnly, setFoilOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  // Rarities for dropdown
  const [rarities, setRarities] = useState<string[]>([]);
  const [availableGames, setAvailableGames] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const loadGenRef = useRef(0);
  const [modalListing, setModalListing] = useState<Listing | null>(null);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Load available games on mount
  useEffect(() => {
    listingsApi.getGames().then(setAvailableGames).catch(() => setAvailableGames([]));
  }, []);

  // Load rarities when game changes
  useEffect(() => {
    listingsApi.getRarities(game || undefined).then(setRarities).catch(() => setRarities([]));
  }, [game]);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setIsLoading(true);
    try {
      const result = await listingsApi.getListings({
        game: game || undefined,
        q: debouncedSearch || undefined,
        condition: condition || undefined,
        rarity: rarity || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        foilOnly: foilOnly || undefined,
        sortBy,
        page,
        limit: 24,
      });
      if (gen !== loadGenRef.current) return;
      setListings(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } finally {
      if (gen === loadGenRef.current) setIsLoading(false);
    }
  }, [game, debouncedSearch, condition, rarity, minPrice, maxPrice, foilOnly, sortBy, page]);

  useEffect(() => { load(); }, [load]);

  const handleGameChange = (g: string) => {
    setGame(g);
    setRarity("");
    setPage(1);
  };

  const clearAllFilters = () => {
    setCondition("");
    setRarity("");
    setMinPrice("");
    setMaxPrice("");
    setFoilOnly(false);
    setSortBy("newest");
    setPage(1);
  };

  const activeFilterCount = [
    condition, rarity, minPrice, maxPrice,
    foilOnly ? "foil" : "",
    sortBy !== "newest" ? "sort" : "",
  ].filter(Boolean).length;

  const handleOffer = (listing: Listing) => {
    if (!isAuthenticated) return;
    setDetailListing(null);
    setModalListing(listing);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Tag className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Listings</h1>
              <p className="text-slate-400 text-base mt-0.5">
                {total > 0
                  ? `${total.toLocaleString()} card${total !== 1 ? "s" : ""} available for trade`
                  : "Browse available cards"}
              </p>
            </div>
          </div>
        </div>

        {/* Search + Sort + Filter toggle row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by card name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-base text-white focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-base font-medium transition-colors",
              filtersOpen || activeFilterCount > 0
                ? "bg-green-600/20 border-green-600/40 text-green-400"
                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-green-500 text-white text-base font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Game tabs — only show games with active listings */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {GAMES.filter((g) => g.key === "" || availableGames.includes(g.key)).map((g) => (
            <button
              key={g.key}
              onClick={() => handleGameChange(g.key)}
              className={cn(
                "px-4 py-1.5 rounded-full text-base font-medium transition-colors",
                game === g.key
                  ? "bg-green-600 text-white"
                  : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Expanded filter panel */}
        {filtersOpen && (
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 mb-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* Condition */}
              <div>
                <label className="block text-base font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Condition
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => { setCondition(condition === c.key ? "" : c.key); setPage(1); }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-base font-medium transition-colors",
                        condition === c.key
                          ? "bg-green-600 text-white"
                          : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rarity */}
              <div>
                <label className="block text-base font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Rarity
                </label>
                <div className="relative">
                  <select
                    value={rarity}
                    onChange={(e) => { setRarity(e.target.value); setPage(1); }}
                    className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-base text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Rarities</option>
                    {rarities.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-base font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Price Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">$</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                      className="w-full pl-6 pr-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-base text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <span className="text-slate-400 text-base">–</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">$</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                      className="w-full pl-6 pr-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-base text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Extras */}
              <div>
                <label className="block text-base font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Special
                </label>
                <button
                  onClick={() => { setFoilOnly(!foilOnly); setPage(1); }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-base font-medium transition-colors w-full",
                    foilOnly
                      ? "bg-purple-600/20 border-purple-600/40 text-purple-400"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Foil Only
                  <div className={cn(
                    "ml-auto w-8 h-4 rounded-full relative transition-colors",
                    foilOnly ? "bg-purple-600" : "bg-slate-700"
                  )}>
                    <div className={cn(
                      "w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all",
                      foilOnly ? "left-4" : "left-0.5"
                    )} />
                  </div>
                </button>
              </div>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={clearAllFilters}
                  className="text-base text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {!filtersOpen && activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {condition && (
              <FilterChip label={(CONDITION_LABELS as Record<string, string>)[condition] ?? condition} onRemove={() => { setCondition(""); setPage(1); }} />
            )}
            {rarity && (
              <FilterChip label={rarity} onRemove={() => { setRarity(""); setPage(1); }} />
            )}
            {(minPrice || maxPrice) && (
              <FilterChip
                label={`$${minPrice || "0"} – $${maxPrice || "∞"}`}
                onRemove={() => { setMinPrice(""); setMaxPrice(""); setPage(1); }}
              />
            )}
            {foilOnly && (
              <FilterChip label="Foil Only" onRemove={() => { setFoilOnly(false); setPage(1); }} />
            )}
            {sortBy !== "newest" && (
              <FilterChip label={SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? sortBy} onRemove={() => { setSortBy("newest"); setPage(1); }} />
            )}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-green-400" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg font-medium">No listings found</p>
            <p className="text-slate-400 text-base mt-1">
              {search || game || activeFilterCount > 0
                ? "Try adjusting your filters"
                : "No cards are currently listed for trade"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isAuthenticated={isAuthenticated}
                isOwnListing={user?.id === listing.user.id}
                onDetail={() => setDetailListing(listing)}
                onOffer={() => handleOffer(listing)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-700 text-base text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-base text-slate-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-700 text-base text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>

      {/* Listing Detail Modal */}
      {detailListing && (
        <ListingDetailModal
          listing={detailListing}
          isAuthenticated={isAuthenticated}
          isOwnListing={user?.id === detailListing.user.id}
          onClose={() => setDetailListing(null)}
          onOffer={() => handleOffer(detailListing)}
        />
      )}

      {/* Trade Proposal Modal */}
      {modalListing && (
        <TradeProposalModal
          isOpen={true}
          onClose={() => setModalListing(null)}
          targetUser={listingUserToUser(modalListing)}
          preselectedCards={[listingToCollectionItem(modalListing)]}
        />
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 bg-green-600/15 border border-green-600/30 text-green-400 text-base font-medium px-2.5 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors ml-0.5">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function ListingCard({
  listing,
  isAuthenticated,
  isOwnListing,
  onDetail,
  onOffer,
}: {
  listing: Listing;
  isAuthenticated: boolean;
  isOwnListing: boolean;
  onDetail: () => void;
  onOffer: () => void;
}) {
  const price = listing.askingValueOverride ?? listing.currentMarketValue;
  const imageUrl = listing.media[0]?.url ?? listing.card.imageUrl;

  return (
    <div className="group relative bg-slate-900/60 border border-slate-700/60 rounded-2xl overflow-hidden hover:border-green-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 flex flex-col cursor-pointer" onClick={onDetail}>

      {/* Card image */}
      <div className="aspect-[2/3] bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.card.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-10 w-10 text-slate-400" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 to-transparent" />

        {/* Price badge */}
        {price != null && (
          <div className={`absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-base font-bold px-2 py-0.5 rounded-lg ${listing.askingValueOverride != null ? "text-teal-400" : "text-green-400"}`}>
            {listing.askingValueOverride != null && <span className="opacity-70 text-base block leading-none mb-0.5">ASKING</span>}
            ${price.toFixed(2)}
          </div>
        )}

        {/* Foil badge */}
        {listing.isFoil && (
          <div className="absolute top-2 left-2 bg-purple-600/80 backdrop-blur-sm text-white text-base font-bold px-1.5 py-0.5 rounded-md">
            Foil
          </div>
        )}

        {/* Rarity badge */}
        {listing.card.rarity && (
          <div className="absolute bottom-3 left-2 bg-black/60 backdrop-blur-sm text-slate-300 text-base font-semibold px-1.5 py-0.5 rounded">
            {listing.card.rarity}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-base font-bold text-white line-clamp-2 leading-tight group-hover:text-green-400 transition-colors">
            {listing.card.name}
          </p>
          <p className="text-base text-slate-400 mt-0.5 truncate">{listing.card.setName}</p>
        </div>

        {/* Condition */}
        <span className={cn(
          "self-start text-base font-medium px-2 py-0.5 rounded-full",
          CONDITION_COLORS[listing.condition] ?? "bg-slate-700 text-slate-400"
        )}>
          {CONDITION_LABELS[listing.condition]}
        </span>

        {/* Owner */}
        <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-slate-800">
          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {listing.user.avatarUrl ? (
              <img src={listing.user.avatarUrl} alt="" className="w-5 h-5 object-cover" />
            ) : (
              <span className="text-base font-bold text-slate-400">
                {listing.user.username[0].toUpperCase()}
              </span>
            )}
          </div>
          <Link
            href={`/profile/${listing.user.username}`}
            onClick={(e) => { e.stopPropagation(); }}
            className="text-base text-slate-400 hover:text-white truncate transition-colors"
          >
            {listing.user.username}
          </Link>
          {listing.user.tier && TIER_STYLES[listing.user.tier] && (
            <span className={cn(
              "ml-auto text-base font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
              TIER_STYLES[listing.user.tier]
            )}>
              {listing.user.tier[0]}
            </span>
          )}
        </div>

        {/* Description */}
        {listing.listingDescription && (
          <p className="text-base text-slate-400 line-clamp-2 leading-relaxed">
            {listing.listingDescription}
          </p>
        )}

        {/* CTA */}
        {isAuthenticated && !isOwnListing ? (
          <button
            onClick={(e) => { e.stopPropagation(); onOffer(); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-green-600/20 hover:bg-green-600 border border-green-600/40 hover:border-green-600 text-green-400 hover:text-white rounded-lg text-base font-semibold transition-all duration-200 mt-1"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Make Offer
          </button>
        ) : !isAuthenticated ? (
          <Link
            href="/auth/login"
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg text-base font-semibold transition-colors mt-1"
          >
            Sign in to offer
          </Link>
        ) : (
          <div className="w-full py-2 text-center text-base text-slate-400 mt-1">Your listing</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Listing Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

function ListingDetailModal({
  listing,
  isAuthenticated,
  isOwnListing,
  onClose,
  onOffer,
}: {
  listing: Listing;
  isAuthenticated: boolean;
  isOwnListing: boolean;
  onClose: () => void;
  onOffer: () => void;
}) {
  const price = listing.askingValueOverride ?? listing.currentMarketValue;
  const imageUrl = listing.media[0]?.url ?? listing.card.imageUrl;
  const allImages = listing.media.length > 0
    ? listing.media.map((m) => m.url)
    : listing.card.imageUrl ? [listing.card.imageUrl] : [];

  const [activeImage, setActiveImage] = useState(0);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white truncate pr-4">{listing.card.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col sm:flex-row gap-6">
          {/* Image column */}
          <div className="flex-shrink-0 w-full sm:w-48">
            <div className="aspect-[2/3] bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 rounded-xl overflow-hidden relative">
              {allImages[activeImage] ? (
                <img
                  src={allImages[activeImage]}
                  alt={listing.card.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-slate-400" />
                </div>
              )}
              {listing.isFoil && (
                <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-base font-bold px-1.5 py-0.5 rounded-md">
                  Foil
                </div>
              )}
            </div>
            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="flex gap-1.5 mt-2">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "w-12 h-16 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0",
                      activeImage === i ? "border-green-500" : "border-slate-700 hover:border-slate-500"
                    )}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info column */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Card identity */}
            <div>
              <p className="text-slate-400 text-base">{listing.card.setName}</p>
              {listing.card.cardNumber && (
                <p className="text-slate-400 text-base mt-0.5">#{listing.card.cardNumber}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={cn(
                  "text-base font-medium px-2.5 py-1 rounded-full",
                  CONDITION_COLORS[listing.condition as string] ?? "bg-slate-700 text-slate-400"
                )}>
                  {CONDITION_LABELS[listing.condition]}
                </span>
                {listing.card.rarity && (
                  <span className="text-base font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {listing.card.rarity}
                  </span>
                )}
                {listing.isFoil && (
                  <span className="text-base font-medium px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300">
                    ✦ Foil
                  </span>
                )}
                {listing.isFirstEdition && (
                  <span className="text-base font-medium px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">
                    1st Edition
                  </span>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-slate-800/50 rounded-xl p-3 space-y-1.5">
              {listing.askingValueOverride != null ? (
                <div className="flex items-baseline justify-between">
                  <span className="text-base text-slate-400">Asking price</span>
                  <span className="text-xl font-bold text-teal-400">${listing.askingValueOverride.toFixed(2)}</span>
                </div>
              ) : null}
              {listing.currentMarketValue != null && (
                <div className="flex items-baseline justify-between">
                  <span className="text-base text-slate-400">Market value</span>
                  <span className={cn(
                    "font-semibold",
                    listing.askingValueOverride != null ? "text-base text-slate-400" : "text-xl text-green-400"
                  )}>
                    ${listing.currentMarketValue.toFixed(2)}
                  </span>
                </div>
              )}
              {price == null && (
                <p className="text-slate-400 text-base">No price set</p>
              )}
            </div>

            {/* Description */}
            {listing.listingDescription && (
              <div>
                <p className="text-base font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-base text-slate-300 leading-relaxed">{listing.listingDescription}</p>
              </div>
            )}

            {/* Language */}
            {listing.language && listing.language !== "EN" && (
              <div className="flex items-center gap-2 text-base text-slate-400">
                <Layers className="h-3.5 w-3.5" />
                Language: <span className="text-white font-medium">{listing.language}</span>
              </div>
            )}

            {/* Owner */}
            <div className="pt-3 border-t border-slate-800">
              <p className="text-base font-semibold text-slate-400 uppercase tracking-wider mb-2">Listed by</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {listing.user.avatarUrl ? (
                    <img src={listing.user.avatarUrl} alt="" className="w-9 h-9 object-cover" />
                  ) : (
                    <span className="text-base font-bold text-slate-400">
                      {listing.user.username[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/profile/${listing.user.username}`}
                    onClick={onClose}
                    className="text-base font-semibold text-white hover:text-green-400 transition-colors"
                  >
                    {listing.user.username}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Star className="h-3 w-3 text-yellow-400" />
                    <span className="text-base text-slate-400">{listing.user.reputationScore} rep</span>
                    {listing.user.tier && TIER_STYLES[listing.user.tier] && (
                      <span className={cn("text-base font-bold px-1.5 py-0.5 rounded-full", TIER_STYLES[listing.user.tier])}>
                        {listing.user.tier}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-slate-800">
          {isAuthenticated && !isOwnListing ? (
            <button
              onClick={onOffer}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Make Offer
            </button>
          ) : !isAuthenticated ? (
            <Link
              href="/auth/login"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
            >
              Sign in to make an offer
            </Link>
          ) : (
            <p className="text-center text-base text-slate-400 py-2">This is your listing</p>
          )}
        </div>
      </div>
    </div>
  );
}
