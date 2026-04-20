"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, Package, Heart, Users, ArrowLeftRight, Star, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, WantPriority, User } from "@/types";
import { collectionApi, AddCollectionItemPayload, AddWantPayload } from "@/lib/api/collection";
import { getCardHolders } from "@/lib/api/cards";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { CONDITION_LABELS } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TradeProposalModal } from "@/components/trades/TradeProposalModal";
import { getInitials } from "@/lib/utils";

const PRIORITY_LABELS: Record<WantPriority, string> = {
  HIGH: "High Priority",
  MEDIUM: "Medium Priority",
  LOW: "Low Priority",
};

interface CardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
}

export function CardDetailModal({ isOpen, onClose, card }: CardDetailModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"details" | "traders">("details");
  const [activeForm, setActiveForm] = useState<"collection" | "wants" | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [holdersPage, setHoldersPage] = useState(1);
  const [tradeTarget, setTradeTarget] = useState<{ user: User; collectionItemId: string } | null>(null);

  // Collection form state
  const [condition, setCondition] = useState<keyof typeof CONDITION_LABELS>("NEAR_MINT");
  const [isFoil, setIsFoil] = useState(false);
  const [isFirstEdition, setIsFirstEdition] = useState(false);
  const [notes, setNotes] = useState("");
  const [availableForTrade, setAvailableForTrade] = useState(true);

  // Wants form state
  const [maxCondition, setMaxCondition] = useState<keyof typeof CONDITION_LABELS>("NEAR_MINT");
  const [priority, setPriority] = useState<WantPriority>("MEDIUM");
  const [wantNotes, setWantNotes] = useState("");

  const { data: holdersData, isLoading: holdersLoading } = useQuery({
    queryKey: ["cardHolders", card.id, holdersPage],
    queryFn: () => getCardHolders(card.id, holdersPage, 10),
    enabled: isOpen && activeTab === "traders",
  });

  if (!isOpen) return null;

  const handleAddToCollection = async () => {
    if (!user) { router.push("/auth/login"); return; }
    setIsAdding(true);
    try {
      const payload: AddCollectionItemPayload = {
        cardId: card.id,
        condition,
        isFoil,
        isFirstEdition,
        notes: notes || undefined,
        status: availableForTrade ? "AVAILABLE" : "UNAVAILABLE",
      };
      await collectionApi.addToCollection(payload);
      alert("Card added to your collection!");
      onClose();
      router.refresh();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add card to collection");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddToWants = async () => {
    if (!user) { router.push("/auth/login"); return; }
    setIsAdding(true);
    try {
      const payload: AddWantPayload = { cardId: card.id, maxCondition, priority, notes: wantNotes || undefined };
      await collectionApi.addToWants(payload);
      alert("Card added to your want list!");
      onClose();
      router.refresh();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add card to want list");
    } finally {
      setIsAdding(false);
    }
  };

  const getRarityColor = (rarity: string | null) => {
    if (!rarity) return "from-slate-700 to-slate-800 text-slate-300";
    const lower = rarity.toLowerCase();
    if (lower.includes("ultra rare") || lower.includes("secret")) return "from-yellow-400 via-amber-500 to-orange-500 text-white";
    if (lower.includes("rare") || lower.includes("holo")) return "from-purple-500 via-pink-500 to-rose-500 text-white";
    if (lower.includes("uncommon")) return "from-blue-500 via-cyan-500 to-teal-500 text-white";
    if (lower.includes("promo")) return "from-green-500 via-emerald-500 to-teal-500 text-white";
    return "from-slate-600 to-slate-700 text-slate-200";
  };

  const holders = holdersData?.data ?? [];
  const totalHolders = holdersData?.total ?? 0;
  const totalHolderPages = holdersData?.totalPages ?? 1;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold">{card.name}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package size={16} />
              Details
            </button>
            <button
              onClick={() => { setActiveTab("traders"); setActiveForm(null); }}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "traders"
                  ? "border-green-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users size={16} />
              Available Traders
              {totalHolders > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-300 text-xs font-bold">
                  {totalHolders}
                </span>
              )}
            </button>
          </div>

          {/* ── DETAILS TAB ── */}
          {activeTab === "details" && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card Image */}
                <div>
                  <div className="aspect-[2/3] bg-gradient-to-br from-blue-950 via-purple-950 to-slate-950 rounded-xl overflow-hidden border-2 border-slate-700">
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-20 w-20 text-slate-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-3xl font-bold mb-2">{card.name}</h3>
                    <p className="text-lg text-slate-400">{card.setName}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                      {card.setCode}
                    </span>
                    {card.cardNumber && (
                      <span className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-mono font-semibold">
                        #{card.cardNumber}
                      </span>
                    )}
                    {card.rarity && (
                      <span className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getRarityColor(card.rarity)} font-bold uppercase text-xs tracking-wider`}>
                        {card.rarity}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!activeForm && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setActiveForm("collection")}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                        >
                          <Plus className="h-5 w-5" />
                          Add to Collection
                        </button>
                        <button
                          onClick={() => setActiveForm("wants")}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-semibold transition-colors"
                        >
                          <Heart className="h-5 w-5" />
                          Add to Wants
                        </button>
                      </div>
                      <button
                        onClick={() => { setActiveTab("traders"); setActiveForm(null); }}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600/20 border border-green-500/40 hover:bg-green-600/30 text-green-300 rounded-lg font-semibold transition-colors"
                      >
                        <Users size={18} />
                        See who has this card for trade
                      </button>
                    </div>
                  )}

                  {/* Collection Form */}
                  {activeForm === "collection" && (
                    <div className="space-y-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <h4 className="font-semibold text-lg">Add to Collection</h4>
                      <div>
                        <label className="block text-sm font-medium mb-2">Condition</label>
                        <select
                          value={condition}
                          onChange={(e) => setCondition(e.target.value as any)}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={isFoil} onChange={(e) => setIsFoil(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600" />
                          <span className="text-sm">Foil/Holo</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={isFirstEdition} onChange={(e) => setIsFirstEdition(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600" />
                          <span className="text-sm">1st Edition</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={availableForTrade} onChange={(e) => setAvailableForTrade(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600" />
                          <span className="text-sm">Available for Trade</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any additional notes..."
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          maxLength={500}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAddToCollection} disabled={isAdding} className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors">
                          {isAdding ? "Adding..." : "Add to Collection"}
                        </button>
                        <button onClick={() => setActiveForm(null)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Wants Form */}
                  {activeForm === "wants" && (
                    <div className="space-y-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <h4 className="font-semibold text-lg">Add to Want List</h4>
                      <div>
                        <label className="block text-sm font-medium mb-2">Maximum Acceptable Condition</label>
                        <select
                          value={maxCondition}
                          onChange={(e) => setMaxCondition(e.target.value as any)}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label} or better</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Priority</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as WantPriority)}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                        <textarea
                          value={wantNotes}
                          onChange={(e) => setWantNotes(e.target.value)}
                          placeholder="Any specific preferences..."
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          rows={3}
                          maxLength={500}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAddToWants} disabled={isAdding} className="flex-1 px-6 py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors">
                          {isAdding ? "Adding..." : "Add to Wants"}
                        </button>
                        <button onClick={() => setActiveForm(null)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TRADERS TAB ── */}
          {activeTab === "traders" && (
            <div className="p-6">
              {holdersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                </div>
              ) : holders.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-slate-300">No traders available</p>
                  <p className="text-slate-500 mt-1 text-sm">Nobody currently has this card available for trade.</p>
                  <button
                    onClick={() => setActiveForm("wants")}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600/20 border border-pink-500/40 text-pink-300 text-sm font-medium hover:bg-pink-600/30 transition-colors"
                    onClickCapture={() => setActiveTab("details")}
                  >
                    <Heart size={16} />
                    Add to want list to get notified
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-400 mb-4">
                    <span className="text-white font-semibold">{totalHolders}</span> trader{totalHolders !== 1 ? "s" : ""} ha{totalHolders !== 1 ? "ve" : "s"} this card available for trade
                  </p>

                  <div className="space-y-3">
                    {holders.map((holder) => {
                      const isOwnCard = user?.id === holder.user.id;
                      const value = holder.askingValueOverride ?? holder.currentMarketValue;

                      return (
                        <div
                          key={holder.id}
                          className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          {/* Avatar */}
                          <Link href={`/profile/${holder.user.username}`} onClick={onClose}>
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border-2 border-slate-600 hover:border-blue-500 transition-colors flex-shrink-0">
                              {holder.user.avatarUrl ? (
                                <img src={holder.user.avatarUrl} alt={holder.user.username} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-white">{getInitials(holder.user.username)}</span>
                              )}
                            </div>
                          </Link>

                          {/* User info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/profile/${holder.user.username}`}
                                onClick={onClose}
                                className="font-semibold text-white hover:text-blue-400 transition-colors"
                              >
                                @{holder.user.username}
                              </Link>
                              <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                                <Star size={11} fill="currentColor" />
                                <span>{holder.user.reputationScore?.toFixed(1) ?? "—"}</span>
                              </div>
                              <span className="text-xs text-slate-500">{holder.user.tradeCount} trades</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-xs font-bold">
                                {CONDITION_LABELS[holder.condition as keyof typeof CONDITION_LABELS] ?? holder.condition}
                              </span>
                              {holder.isFoil && <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-300 text-xs font-bold">FOIL</span>}
                              {holder.isFirstEdition && <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-xs font-bold">1ST ED</span>}
                              {value != null && (
                                <span className="text-xs text-green-400 font-semibold">${value.toFixed(2)}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {!isOwnCard && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link
                                href={`/profile/${holder.user.username}`}
                                onClick={onClose}
                                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors"
                              >
                                View Collection
                              </Link>
                              {user ? (
                                <button
                                  onClick={() => setTradeTarget({
                                    user: holder.user as User,
                                    collectionItemId: holder.id,
                                  })}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
                                >
                                  <ArrowLeftRight size={14} />
                                  Propose Trade
                                </button>
                              ) : (
                                <Link
                                  href="/auth/login"
                                  onClick={onClose}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
                                >
                                  Sign in to trade
                                </Link>
                              )}
                            </div>
                          )}
                          {isOwnCard && (
                            <span className="text-xs text-slate-500 italic flex-shrink-0">Your card</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalHolderPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <button
                        onClick={() => setHoldersPage((p) => Math.max(1, p - 1))}
                        disabled={holdersPage === 1}
                        className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-sm text-slate-400">
                        Page {holdersPage} of {totalHolderPages}
                      </span>
                      <button
                        onClick={() => setHoldersPage((p) => Math.min(totalHolderPages, p + 1))}
                        disabled={holdersPage === totalHolderPages}
                        className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trade Proposal Modal — opens on top */}
      {tradeTarget && (
        <TradeProposalModal
          isOpen={true}
          onClose={() => setTradeTarget(null)}
          targetUser={tradeTarget.user}
          preselectedCards={[]}
        />
      )}
    </>
  );
}
