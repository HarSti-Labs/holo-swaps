"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  searchCards,
  getCardHolders,
  getSets,
  getRarities,
  SearchCardsParams,
  CardHolder,
} from "@/lib/api/cards";
import { collectionApi, AddWantPayload } from "@/lib/api/collection";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Users,
  ArrowLeftRight,
  Loader2,
  Plus,
  Minus,
  CheckSquare,
  Square,
  X,
  Check,
  Layers,
  Heart,
} from "lucide-react";
import { Card, CONDITION_LABELS, User, CardCondition, WantPriority } from "@/types";
import { TradeProposalModal } from "@/components/trades/TradeProposalModal";
import { CardDetailModal } from "@/components/cards/CardDetailModal";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

// ── Rarity colour helper ──────────────────────────────────────────────────────

function getRarityColor(rarity: string | null) {
  if (!rarity) return "from-slate-700 to-slate-800 text-slate-300";
  const lower = rarity.toLowerCase();
  if (lower.includes("ultra rare") || lower.includes("secret"))
    return "from-yellow-400 via-amber-500 to-orange-500 text-white shadow-xl shadow-yellow-500/60 animate-pulse";
  if (lower.includes("rare") || lower.includes("holo") || lower.includes("illustration"))
    return "from-purple-500 via-pink-500 to-rose-500 text-white shadow-xl shadow-purple-500/60";
  if (lower.includes("uncommon"))
    return "from-blue-500 via-cyan-500 to-teal-500 text-white shadow-xl shadow-blue-500/60";
  if (lower.includes("promo"))
    return "from-green-500 via-emerald-500 to-teal-500 text-white shadow-xl shadow-green-500/60";
  return "from-slate-600 to-slate-700 text-slate-200";
}

// ── Card item ─────────────────────────────────────────────────────────────────

function CardItem({
  card,
  isSelected,
  isChecked,
  isSelectMode,
  onClick,
  onAdd,
}: {
  card: Card;
  isSelected: boolean;
  isChecked: boolean;
  isSelectMode: boolean;
  onClick: () => void;
  onAdd: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative group cursor-pointer bg-slate-900/60 border-2 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isChecked
          ? "border-green-500 shadow-xl shadow-green-500/30"
          : isSelected
          ? "border-blue-500 shadow-xl shadow-blue-500/30"
          : "border-slate-700/60 hover:border-blue-500/50 hover:shadow-blue-500/20"
      }`}
    >
      {/* Rainbow shimmer on hover (normal mode only) */}
      {!isSelectMode && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer pointer-events-none z-20" />
      )}

      {/* Selection overlay */}
      {isChecked && (
        <div className="absolute inset-0 bg-green-500/10 z-10 pointer-events-none" />
      )}

      {/* Card Image */}
      <div className="aspect-[2/3] bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 relative overflow-hidden">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/40 to-pink-500/40 flex items-center justify-center border-2 border-blue-400/40 group-hover:border-blue-400/80 transition-all duration-500">
                <span className="text-3xl">✨</span>
              </div>
              <p className="text-xs text-slate-400 font-bold">No Image</p>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />

        {/* Select mode: checkbox top-left */}
        {isSelectMode ? (
          <div className="absolute top-2 left-2 z-30">
            {isChecked ? (
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-black/50 border-2 border-slate-400 group-hover:border-white transition-colors" />
            )}
          </div>
        ) : (
          /* Normal mode: blue dot when traders-panel selected */
          isSelected && (
            <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-blue-400/50 z-10" />
          )
        )}

        {/* + button (always shown on hover, hidden in select mode) */}
        {!isSelectMode && (
          <button
            onClick={onAdd}
            className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg backdrop-blur-sm"
            title="Add to collection"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-black text-sm text-white line-clamp-2 leading-tight min-h-[2.5rem] group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
          {card.name}
        </h3>
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-black border border-blue-500/30">
            {card.setCode}
          </span>
          {card.cardNumber && (
            <span className="text-slate-500 font-mono font-bold">#{card.cardNumber}</span>
          )}
        </div>
        <p className="text-xs text-slate-400 line-clamp-1 font-semibold">{card.setName}</p>
        {card.rarity && (
          <span
            className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-widest bg-gradient-to-r ${getRarityColor(card.rarity)}`}
          >
            {card.rarity}
          </span>
        )}
      </div>
    </div>
  );
}

const PRIORITY_LABELS: Record<WantPriority, string> = {
  HIGH: "High Priority",
  MEDIUM: "Medium Priority",
  LOW: "Low Priority",
};

// ── Bulk Add Modal ────────────────────────────────────────────────────────────

function BulkAddModal({
  cards,
  mode,
  onClose,
  onSuccess,
}: {
  cards: Card[];
  mode: "collection" | "wants";
  onClose: () => void;
  onSuccess: (count: number) => void;
}) {
  // Collection fields
  const [condition, setCondition] = useState<CardCondition>("NEAR_MINT");
  const [isFoil, setIsFoil] = useState(false);
  const [isFirstEdition, setIsFirstEdition] = useState(false);
  const [availableForTrade, setAvailableForTrade] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // Wants fields
  const [maxCondition, setMaxCondition] = useState<CardCondition>("NEAR_MINT");
  const [priority, setPriority] = useState<WantPriority>("MEDIUM");

  const [isAdding, setIsAdding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const isWants = mode === "wants";
  const accentClass = isWants ? "focus:ring-pink-500" : "focus:ring-blue-500";
  const progressColor = isWants ? "bg-pink-500" : "bg-blue-500";

  const handleAdd = async () => {
    setIsAdding(true);
    setProgress(0);
    setErrors([]);
    const failed: string[] = [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      try {
        if (isWants) {
          await collectionApi.addToWants({ cardId: card.id, maxCondition, priority });
        } else {
          await collectionApi.addToCollection({
            cardId: card.id,
            condition,
            isFoil,
            isFirstEdition,
            status: availableForTrade ? "AVAILABLE" : "UNAVAILABLE",
            quantity,
          });
        }
      } catch {
        failed.push(card.name);
      }
      setProgress(i + 1);
    }

    setErrors(failed);
    setIsAdding(false);
    setDone(true);

    if (failed.length === 0) {
      onSuccess(cards.length);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {isWants ? <Heart className="h-5 w-5 text-pink-400" /> : <Plus className="h-5 w-5 text-blue-400" />}
              {isWants ? "Add to Want List" : "Add to Collection"}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {cards.length} card{cards.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!done ? (
            <>
              {/* Selected cards list */}
              <div className="bg-slate-800/50 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1">
                {cards.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWants ? "bg-pink-400" : "bg-blue-400"}`} />
                    <span className="text-slate-200 truncate">{c.name}</span>
                    <span className="text-slate-500 text-xs flex-shrink-0">{c.setCode}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                Apply to all selected cards
              </p>

              {isWants ? (
                /* Wants fields */
                <>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Max acceptable condition</label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none h-4 w-4" />
                      <select
                        value={maxCondition}
                        onChange={(e) => setMaxCondition(e.target.value as CardCondition)}
                        className={`w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 ${accentClass} appearance-none pr-8`}
                      >
                        {(Object.entries(CONDITION_LABELS) as [CardCondition, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l} or better</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Priority</label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none h-4 w-4" />
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as WantPriority)}
                        className={`w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 ${accentClass} appearance-none pr-8`}
                      >
                        {(Object.entries(PRIORITY_LABELS) as [WantPriority, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                /* Collection fields */
                <>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Condition</label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none h-4 w-4" />
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as CardCondition)}
                        className={`w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 ${accentClass} appearance-none pr-8`}
                      >
                        {(Object.entries(CONDITION_LABELS) as [CardCondition, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { id: "foil", checked: isFoil, onChange: setIsFoil, label: "Foil / Holo" },
                      { id: "first", checked: isFirstEdition, onChange: setIsFirstEdition, label: "1st Edition" },
                      { id: "trade", checked: availableForTrade, onChange: setAvailableForTrade, label: "Available for trade" },
                    ].map(({ id, checked, onChange, label }) => (
                      <label key={id} className="flex items-center gap-3 cursor-pointer group">
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                            checked ? "bg-blue-600 border-blue-600" : "border-slate-600 group-hover:border-slate-400"
                          }`}
                          onClick={() => onChange(!checked)}
                        >
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm text-slate-300">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Quantity per card</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white transition-colors disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-14 text-center px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                        disabled={quantity >= 99}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white transition-colors disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs text-slate-500">copies each</span>
                    </div>
                  </div>
                </>
              )}

              {/* Progress bar (while adding) */}
              {isAdding && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Adding cards…</span>
                    <span>{progress} / {cards.length}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${progressColor} rounded-full transition-all duration-300`}
                      style={{ width: `${(progress / cards.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Done state */
            <div className="text-center py-4 space-y-3">
              {errors.length === 0 ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <Check className="h-7 w-7 text-green-400" />
                  </div>
                  <p className="text-white font-semibold">
                    {cards.length} card{cards.length !== 1 ? "s" : ""} added to your {isWants ? "want list" : "collection"}!
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
                    <Check className="h-7 w-7 text-yellow-400" />
                  </div>
                  <p className="text-white font-semibold">
                    {cards.length - errors.length} of {cards.length} cards added
                  </p>
                  <div className="text-left bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                    <p className="text-xs text-red-400 font-medium mb-1">Failed to add:</p>
                    {errors.map((name) => (
                      <p key={name} className="text-xs text-slate-400 truncate">• {name}</p>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-700">
          {!done ? (
            <>
              <button
                onClick={handleAdd}
                disabled={isAdding}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-semibold text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isWants ? "bg-pink-600 hover:bg-pink-500" : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {isAdding ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</>
                ) : isWants ? (
                  <><Heart className="h-4 w-4" /> Add {cards.length} to Want List</>
                ) : (
                  <><Plus className="h-4 w-4" /> Add {cards.length} to Collection</>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isAdding}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Traders panel ─────────────────────────────────────────────────────────────

function TradersPanel({
  card,
  onProposeTrade,
  currentUserId,
}: {
  card: Card | null;
  onProposeTrade: (holder: CardHolder) => void;
  currentUserId?: string;
}) {
  const [holdersPage, setHoldersPage] = useState(1);

  useEffect(() => {
    setHoldersPage(1);
  }, [card?.id]);

  const { data, isLoading } = useQuery({
    queryKey: ["cardHoldersSidebar", card?.id, holdersPage],
    queryFn: () => getCardHolders(card!.id, holdersPage, 10),
    enabled: !!card,
  });

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
        <Users className="h-16 w-16 text-slate-700 mb-4" />
        <h3 className="text-base font-semibold text-slate-400 mb-2">Select a card</h3>
        <p className="text-sm text-slate-500">
          Click any card to see which traders have it available
        </p>
      </div>
    );
  }

  const holders = data?.data ?? [];
  const totalHolders = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-900/70">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-10 h-14 object-cover rounded-lg border border-slate-700 flex-shrink-0" />
        ) : (
          <div className="w-10 h-14 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 flex-shrink-0">
            <Package className="h-5 w-5 text-slate-600" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate">{card.name}</p>
          <p className="text-xs text-slate-400 truncate">{card.setName}</p>
          {card.rarity && (
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase bg-gradient-to-r ${getRarityColor(card.rarity)}`}>
              {card.rarity}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-slate-800/60 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs font-semibold text-slate-300">
            {isLoading ? "Loading…" : `${totalHolders} trader${totalHolders !== 1 ? "s" : ""} available`}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : holders.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Package className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No traders yet</p>
            <p className="text-xs text-slate-500 mt-1">Nobody has this card available for trade right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {holders.map((holder) => {
              const price = holder.askingValueOverride ?? holder.currentMarketValue;
              return (
                <div key={holder.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors">
                  <Link href={`/profile/${holder.user.username}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 hover:border-blue-400 transition-colors">
                      <span className="text-xs font-bold text-blue-300">{getInitials(holder.user.username)}</span>
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${holder.user.username}`} className="text-sm font-semibold text-white hover:text-blue-400 transition-colors truncate block">
                      {holder.user.username}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {CONDITION_LABELS[holder.condition as keyof typeof CONDITION_LABELS] ?? holder.condition}
                      </span>
                      {holder.isFoil && <span className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">Foil</span>}
                      {holder.isFirstEdition && <span className="text-xs text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">1st Ed</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {price != null && <span className="text-xs font-semibold text-green-400">${price.toFixed(2)}</span>}
                    {holder.user.id !== currentUserId && (
                      <button onClick={() => onProposeTrade(holder)} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors">
                        <ArrowLeftRight className="h-3 w-3" />
                        Trade
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 border-t border-slate-800">
          <button onClick={() => setHoldersPage((p) => Math.max(1, p - 1))} disabled={holdersPage === 1} className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-400">{holdersPage} / {totalPages}</span>
          <button onClick={() => setHoldersPage((p) => Math.min(totalPages, p + 1))} disabled={holdersPage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Multi-card Traders Panel ──────────────────────────────────────────────────

function MultiCardTradersPanel({
  cards,
  onProposeTrade,
  currentUserId,
}: {
  cards: Card[];
  onProposeTrade: (holder: CardHolder) => void;
  currentUserId?: string;
}) {
  const [conditionFilter, setConditionFilter] = useState<string>("");
  const [cardFilter, setCardFilter] = useState<string>("");

  // Reset card filter if a previously-selected card is deselected
  useEffect(() => {
    if (cardFilter && !cards.find((c) => c.id === cardFilter)) {
      setCardFilter("");
    }
  }, [cards, cardFilter]);

  const holderQueries = useQueries({
    queries: cards.map((card) => ({
      queryKey: ["cardHoldersSidebar", card.id, 1],
      queryFn: () => getCardHolders(card.id, 1, 15),
      staleTime: 60_000,
    })),
  });

  const displayCards = cardFilter ? cards.filter((c) => c.id === cardFilter) : cards;

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
        <Layers className="h-12 w-12 text-slate-700 mb-3" />
        <p className="text-sm font-semibold text-slate-400">Select cards to see traders</p>
        <p className="text-xs text-slate-500 mt-1">Check cards in the grid to view who has them</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-900/40">
        <div className="relative">
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none h-3.5 w-3.5" />
          <select
            value={cardFilter}
            onChange={(e) => setCardFilter(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All selected cards ({cards.length})</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.setCode}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none h-3.5 w-3.5" />
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Any condition</option>
            {(Object.entries(CONDITION_LABELS) as [CardCondition, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Card sections */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {displayCards.map((card) => {
          const qIdx = cards.findIndex((c) => c.id === card.id);
          const query = holderQueries[qIdx];
          const allHolders = query?.data?.data ?? [];
          const holders = conditionFilter
            ? allHolders.filter((h) => h.condition === conditionFilter)
            : allHolders;
          const totalRaw = query?.data?.total ?? 0;

          return (
            <div key={card.id}>
              {/* Card header */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-800/50 sticky top-0 z-10">
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-7 h-10 object-cover rounded flex-shrink-0 border border-slate-700"
                  />
                ) : (
                  <div className="w-7 h-10 bg-slate-700 rounded flex-shrink-0 flex items-center justify-center border border-slate-600">
                    <Package className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">{card.name}</p>
                  <p className="text-xs text-slate-500 truncate">{card.setCode} {card.cardNumber ? `#${card.cardNumber}` : ""}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {query?.isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  ) : (
                    <span className={`text-xs font-bold ${holders.length > 0 ? "text-green-400" : "text-slate-500"}`}>
                      {holders.length}{conditionFilter ? "" : totalRaw > 15 ? "+" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Traders for this card */}
              {query?.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                </div>
              ) : holders.length === 0 ? (
                <p className="text-xs text-slate-600 italic px-4 py-2.5">
                  {conditionFilter ? "No traders match this condition" : "No traders available"}
                </p>
              ) : (
                <div>
                  {holders.map((holder) => {
                    const price = holder.askingValueOverride ?? holder.currentMarketValue;
                    return (
                      <div key={holder.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/40 transition-colors">
                        <Link href={`/profile/${holder.user.username}`}>
                          <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 hover:border-blue-400 transition-colors">
                            <span className="text-xs font-bold text-blue-300">{getInitials(holder.user.username)}</span>
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${holder.user.username}`} className="text-xs font-semibold text-white hover:text-blue-400 transition-colors truncate block">
                            {holder.user.username}
                          </Link>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-400 bg-slate-800 px-1 py-0.5 rounded">
                              {CONDITION_LABELS[holder.condition as keyof typeof CONDITION_LABELS] ?? holder.condition}
                            </span>
                            {holder.isFoil && <span className="text-xs text-yellow-400">Foil</span>}
                            {holder.isFirstEdition && <span className="text-xs text-purple-400">1st</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {price != null && <span className="text-xs font-semibold text-green-400">${price.toFixed(2)}</span>}
                          {holder.user.id !== currentUserId && (
                            <button
                              onClick={() => onProposeTrade(holder)}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
                            >
                              <ArrowLeftRight className="h-2.5 w-2.5" />
                              Trade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CardsPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState("");
  const [selectedRarity, setSelectedRarity] = useState("");
  const [page, setPage] = useState(1);

  // Traders panel
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Single-card add modal
  const [collectionModalCard, setCollectionModalCard] = useState<Card | null>(null);

  // Trade modal
  const [tradeTarget, setTradeTarget] = useState<User | null>(null);

  // Multi-select
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [checkedCards, setCheckedCards] = useState<Map<string, Card>>(new Map());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<"collection" | "wants">("collection");

  const limit = 18;

  // Exit select mode clears selection
  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setCheckedCards(new Map());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: setsData } = useQuery({ queryKey: ["sets"], queryFn: getSets, staleTime: 5 * 60 * 1000 });
  const { data: raritiesData } = useQuery({ queryKey: ["rarities", selectedSet], queryFn: () => getRarities(selectedSet || undefined), staleTime: 5 * 60 * 1000 });

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

  const handleProposeTrade = useCallback((holder: CardHolder) => {
    if (!user) return;
    setTradeTarget(holder.user as User);
  }, [user]);

  const toggleCheck = useCallback((card: Card) => {
    setCheckedCards((prev) => {
      const next = new Map(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        next.set(card.id, card);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!data) return;
    setCheckedCards(new Map(data.data.map((c) => [c.id, c])));
  }, [data]);

  const checkedCount = checkedCards.size;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-[1400px]">
        {/* Header */}
        <div className="mb-10 relative">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="relative z-10">
            <h1 className="font-display text-5xl md:text-6xl font-black mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-shimmer">
              Discover Cards
            </h1>
            <p className="text-lg text-slate-300">
              Search the Pokémon card database — click a card to see who has it for trade
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3 max-w-4xl">
          <div className="relative flex-1 min-w-[200px] group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
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
          <div className="relative sm:w-56">
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <select
              value={selectedSet}
              onChange={(e) => { setSelectedSet(e.target.value); setSelectedRarity(""); setPage(1); }}
              className="w-full h-14 pl-4 pr-10 rounded-2xl bg-slate-800 border-2 border-slate-600 hover:border-slate-400 focus:border-slate-400 text-white appearance-none cursor-pointer transition-all outline-none shadow-2xl"
            >
              <option value="">All Sets</option>
              {sets.map((s) => <option key={s.setCode} value={s.setCode}>{s.name}</option>)}
            </select>
          </div>
          <div className="relative sm:w-48">
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <select
              value={selectedRarity}
              onChange={(e) => { setSelectedRarity(e.target.value); setPage(1); }}
              className="w-full h-14 pl-4 pr-10 rounded-2xl bg-slate-800 border-2 border-slate-600 hover:border-slate-400 focus:border-slate-400 text-white appearance-none cursor-pointer transition-all outline-none shadow-2xl"
            >
              <option value="">All Rarities</option>
              {rarities.map((r) => <option key={r} value={r}>{r.replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
            </select>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: card grid */}
          <div className="flex-1 min-w-0">
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            )}

            {error && !isLoading && (
              <div className="text-center py-12 text-red-400">Failed to load cards. Please try again.</div>
            )}

            {!hasFilter && !isLoading && (
              <div className="text-center py-24">
                <div className="text-6xl mb-6">🔍</div>
                <p className="text-xl text-slate-400 font-semibold">Search or pick a set to get started</p>
                <p className="text-slate-500 mt-2">Search by name, filter by set, or narrow down by rarity</p>
              </div>
            )}

            {hasFilter && data && !isLoading && (
              <>
                {data.data.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No cards found matching your search.</p>
                  </div>
                ) : (
                  <>
                    {/* Toolbar row */}
                    <div className="flex items-center justify-between mb-4 gap-3">
                      <p className="text-xs text-slate-500">
                        {data.total} card{data.total !== 1 ? "s" : ""} found
                        {!isSelectMode && " — click one to see traders"}
                      </p>
                      <div className="flex items-center gap-2">
                        {isSelectMode ? (
                          <>
                            <button
                              onClick={selectAll}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                            >
                              <CheckSquare className="h-3.5 w-3.5" />
                              Select all
                            </button>
                            <button
                              onClick={() => setCheckedCards(new Map())}
                              disabled={checkedCount === 0}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                            >
                              <Square className="h-3.5 w-3.5" />
                              Clear
                            </button>
                            <button
                              onClick={exitSelectMode}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                              Exit
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setIsSelectMode(true); setSelectedCard(null); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Select multiple
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {data.data.map((card) => (
                        <CardItem
                          key={card.id}
                          card={card}
                          isSelected={!isSelectMode && selectedCard?.id === card.id}
                          isChecked={checkedCards.has(card.id)}
                          isSelectMode={isSelectMode}
                          onClick={() => {
                            if (isSelectMode) {
                              toggleCheck(card);
                            } else {
                              setSelectedCard((prev) => prev?.id === card.id ? null : card);
                            }
                          }}
                          onAdd={(e) => {
                            e.stopPropagation();
                            setCollectionModalCard(card);
                          }}
                        />
                      ))}
                    </div>

                    {/* Pagination */}
                    {data.totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-2">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
                          <ChevronLeft size={16} /> Previous
                        </button>
                        <span className="text-sm text-slate-400 px-2">{page} / {data.totalPages}</span>
                        <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                    )}

                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} of {data.total} cards
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right: traders panel (sticky) */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="lg:sticky lg:top-20 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "420px", maxHeight: "calc(100vh - 6rem)" }}>
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-400" />
                  Available Traders
                </h2>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                {isSelectMode ? (
                  <MultiCardTradersPanel
                    cards={Array.from(checkedCards.values())}
                    onProposeTrade={handleProposeTrade}
                    currentUserId={user?.id}
                  />
                ) : (
                  <TradersPanel
                    card={selectedCard}
                    onProposeTrade={handleProposeTrade}
                    currentUserId={user?.id}
                  />
                )}
              </div>

              {/* Selection actions */}
              {isSelectMode && checkedCount > 0 && (
                <div className="border-t border-slate-800 p-4 space-y-2.5 bg-slate-900/80">
                  <p className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                    {checkedCount} card{checkedCount !== 1 ? "s" : ""} selected
                  </p>
                  <button
                    onClick={() => { setBulkMode("collection"); setShowBulkModal(true); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add to Collection
                  </button>
                  <button
                    onClick={() => { setBulkMode("wants"); setShowBulkModal(true); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                    Add to Want List
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bulk add modal */}
      {showBulkModal && checkedCount > 0 && (
        <BulkAddModal
          cards={Array.from(checkedCards.values())}
          mode={bulkMode}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setTimeout(() => {
              setShowBulkModal(false);
              exitSelectMode();
            }, 1500);
          }}
        />
      )}

      {/* Single-card add modal */}
      {collectionModalCard && (
        <CardDetailModal
          isOpen={true}
          onClose={() => setCollectionModalCard(null)}
          card={collectionModalCard}
        />
      )}

      {/* Trade Proposal Modal */}
      {tradeTarget && (
        <TradeProposalModal
          isOpen={true}
          onClose={() => setTradeTarget(null)}
          targetUser={tradeTarget}
          preselectedCards={[]}
        />
      )}
    </div>
  );
}
