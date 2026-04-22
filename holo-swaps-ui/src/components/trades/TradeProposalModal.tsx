"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, Package, Send, Loader2, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Minus as MinusIcon } from "lucide-react";
import { CollectionItem, User } from "@/types";
import { collectionApi } from "@/lib/api/collection";
import { tradesApi } from "@/lib/api/trades";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { CONDITION_LABELS } from "@/types";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import Link from "next/link";

interface TradeProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User;
  preselectedCards?: CollectionItem[];
}

export function TradeProposalModal({
  isOpen,
  onClose,
  targetUser,
  preselectedCards = [],
}: TradeProposalModalProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [myCards, setMyCards] = useState<CollectionItem[]>([]);
  const [theirCards, setTheirCards] = useState<CollectionItem[]>(preselectedCards);
  const [myCollection, setMyCollection] = useState<CollectionItem[]>([]);
  const [theirCollection, setTheirCollection] = useState<CollectionItem[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [isLoadingTheir, setIsLoadingTheir] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [cashAdd, setCashAdd] = useState<string>("");
  const [hasAddress, setHasAddress] = useState(false);
  const [isCheckingAddress, setIsCheckingAddress] = useState(true);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadMyCollection();
      loadTheirCollection();
      checkAddress();
    }
  }, [isOpen, currentUser]);

  const checkAddress = async () => {
    setIsCheckingAddress(true);
    try {
      const res = await api.get("/users/me/addresses");
      setHasAddress(res.data.data.length > 0);
    } catch (err) {
      console.error("Failed to check addresses:", err);
      setHasAddress(false);
    } finally {
      setIsCheckingAddress(false);
    }
  };

  const loadMyCollection = async () => {
    if (!currentUser) return;
    setIsLoadingMy(true);
    try {
      const result = await collectionApi.getMyCollection(1, 100);
      setMyCollection(result.data.filter((item) => item.status === "AVAILABLE"));
    } catch (err) {
      console.error("Failed to load my collection:", err);
    } finally {
      setIsLoadingMy(false);
    }
  };

  const loadTheirCollection = async () => {
    setIsLoadingTheir(true);
    try {
      const result = await collectionApi.getUserCollection(targetUser.username, 1, 100);
      setTheirCollection(result.data.filter((item) => item.status === "AVAILABLE"));
    } catch (err) {
      console.error("Failed to load their collection:", err);
    } finally {
      setIsLoadingTheir(false);
    }
  };

  const addMyCard = (card: CollectionItem) => {
    if (!myCards.find((c) => c.id === card.id)) {
      setMyCards([...myCards, card]);
    }
  };

  const removeMyCard = (cardId: string) => {
    setMyCards(myCards.filter((c) => c.id !== cardId));
  };

  const addTheirCard = (card: CollectionItem) => {
    if (!theirCards.find((c) => c.id === card.id)) {
      setTheirCards([...theirCards, card]);
    }
  };

  const removeTheirCard = (cardId: string) => {
    setTheirCards(theirCards.filter((c) => c.id !== cardId));
  };

  const calculateTotalValue = (cards: CollectionItem[]) => {
    return cards.reduce((sum, card) => sum + (card.currentMarketValue || 0), 0);
  };

  const myTotal = calculateTotalValue(myCards);
  const theirTotal = calculateTotalValue(theirCards);
  const cashAddNumber = parseFloat(cashAdd) || 0;
  // positive = you receive more than you give; negative = you give more than you receive
  const netValue = theirTotal - (myTotal + cashAddNumber);
  const isEven = Math.abs(netValue) < 0.50;

  const handleSubmit = async () => {
    if (myCards.length === 0 || theirCards.length === 0) return;

    setIsSubmitting(true);
    try {
      const trade = await tradesApi.propose({
        receiverId: targetUser.id,
        proposerCollectionItemIds: myCards.map((c) => c.id),
        receiverCollectionItemIds: theirCards.map((c) => c.id),
        proposerCashAdd: cashAddNumber > 0 ? cashAddNumber : undefined,
        message: message || undefined,
      });

      router.push(`/trades/${trade.id}`);
      onClose();
    } catch (err: any) {
      console.error("Failed to propose trade:", err);
      alert(err.response?.data?.message || "Failed to propose trade");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold">Propose Trade with {targetUser.username}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Your Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Your Cards</h3>
                <div className="text-sm text-slate-400">
                  Total: ${myTotal.toFixed(2)}
                </div>
              </div>

              {/* Selected Cards */}
              {myCards.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-slate-400">Selected ({myCards.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {myCards.map((card) => (
                      <div
                        key={card.id}
                        className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 flex items-center gap-2"
                      >
                        {card.card.imageUrl ? (
                          <img
                            src={card.card.imageUrl}
                            alt={card.card.name}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{card.card.name}</p>
                          <p className="text-xs text-slate-400">
                            ${card.currentMarketValue?.toFixed(2) || "N/A"}
                          </p>
                        </div>
                        <button
                          onClick={() => removeMyCard(card.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Cards */}
              <div>
                <p className="text-sm text-slate-400 mb-2">Available</p>
                {isLoadingMy ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : myCollection.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No cards available for trade</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {myCollection
                      .filter((c) => !myCards.find((sc) => sc.id === c.id))
                      .map((card) => (
                        <button
                          key={card.id}
                          onClick={() => addMyCard(card)}
                          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-2 flex items-center gap-2 transition-colors text-left"
                        >
                          {card.card.imageUrl ? (
                            <img
                              src={card.card.imageUrl}
                              alt={card.card.name}
                              className="w-12 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{card.card.name}</p>
                            <p className="text-xs text-slate-400">
                              {CONDITION_LABELS[card.condition]}
                            </p>
                            <p className="text-xs text-green-400">
                              ${card.currentMarketValue?.toFixed(2) || "N/A"}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 text-blue-400" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Their Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{targetUser.username}'s Cards</h3>
                <div className="text-sm text-slate-400">
                  Total: ${theirTotal.toFixed(2)}
                </div>
              </div>

              {/* Selected Cards */}
              {theirCards.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-slate-400">Selected ({theirCards.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {theirCards.map((card) => (
                      <div
                        key={card.id}
                        className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 flex items-center gap-2"
                      >
                        {card.card.imageUrl ? (
                          <img
                            src={card.card.imageUrl}
                            alt={card.card.name}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center">
                            <Package className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{card.card.name}</p>
                          <p className="text-xs text-slate-400">
                            ${card.currentMarketValue?.toFixed(2) || "N/A"}
                          </p>
                        </div>
                        <button
                          onClick={() => removeTheirCard(card.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Cards */}
              <div>
                <p className="text-sm text-slate-400 mb-2">Available</p>
                {isLoadingTheir ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : theirCollection.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No cards available for trade</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {theirCollection
                      .filter((c) => !theirCards.find((sc) => sc.id === c.id))
                      .map((card) => (
                        <button
                          key={card.id}
                          onClick={() => addTheirCard(card)}
                          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-2 flex items-center gap-2 transition-colors text-left"
                        >
                          {card.card.imageUrl ? (
                            <img
                              src={card.card.imageUrl}
                              alt={card.card.name}
                              className="w-12 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{card.card.name}</p>
                            <p className="text-xs text-slate-400">
                              {CONDITION_LABELS[card.condition]}
                            </p>
                            <p className="text-xs text-green-400">
                              ${card.currentMarketValue?.toFixed(2) || "N/A"}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 text-blue-400" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cash Add + Value Difference */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
            {/* Add Cash */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Add Cash to Your Offer (optional)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cashAdd}
                  onChange={(e) => setCashAdd(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                This cash will be added on top of your cards to sweeten the deal.
              </p>
            </div>

            {/* Value breakdown */}
            {(myCards.length > 0 || theirCards.length > 0) && (
              <div className="space-y-1.5 pt-2 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>You're offering:</span>
                  <span className="text-white font-medium">
                    ${myTotal.toFixed(2)}{cashAddNumber > 0 && ` + $${cashAddNumber.toFixed(2)} cash`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>You're receiving:</span>
                  <span className="text-white font-medium">${theirTotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <span className="text-sm font-medium text-slate-300">Trade Balance</span>
                  {isEven ? (
                    <span className="flex items-center gap-1.5 text-green-400 font-semibold text-sm">
                      <MinusIcon className="h-3.5 w-3.5" />
                      Even trade
                    </span>
                  ) : netValue > 0 ? (
                    <span className="flex items-center gap-1.5 text-blue-400 font-semibold text-sm">
                      <TrendingUp className="h-3.5 w-3.5" />
                      +${netValue.toFixed(2)} in your favor
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-sm">
                      <TrendingDown className="h-3.5 w-3.5" />
                      +${Math.abs(netValue).toFixed(2)} in their favor
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {isEven
                    ? "Values are roughly equal."
                    : netValue > 0
                    ? "You're receiving more value — they may counter or decline."
                    : "You're offering more value — a generous trade for them."}
                </p>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to your trade proposal..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-slate-500 mt-1">{message.length}/500</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800">
          {!isCheckingAddress && !hasAddress && (
            <div className="mb-4 bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-300 font-medium mb-1">Shipping Address Required</p>
                <p className="text-sm text-yellow-200/80 mb-3">
                  You need to add a shipping address before you can propose trades.
                  Both parties will ship cards to our verification center for authentication.
                </p>
                <Link
                  href="/settings"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Add Shipping Address
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={myCards.length === 0 || theirCards.length === 0 || isSubmitting || !hasAddress}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Proposing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Propose Trade
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
