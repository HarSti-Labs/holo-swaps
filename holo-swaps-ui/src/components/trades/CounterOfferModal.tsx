"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, Package, Send, Loader2, DollarSign, TrendingUp, TrendingDown, Minus as MinusIcon } from "lucide-react";
import { Trade, CollectionItem } from "@/types";
import { collectionApi } from "@/lib/api/collection";
import { tradesApi } from "@/lib/api/trades";
import { CONDITION_LABELS } from "@/types";

interface CounterOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade;
  currentUserId: string;
  onSuccess: () => void;
}

export function CounterOfferModal({ isOpen, onClose, trade, currentUserId, onSuccess }: CounterOfferModalProps) {
  const isProposer = trade.proposer.id === currentUserId;

  // Pre-populate my cards from the current trade
  const currentMyItems = trade.items.filter((i) => i.ownedByProposer === isProposer);
  const currentTheirItems = trade.items.filter((i) => i.ownedByProposer !== isProposer);

  const getCollectionItem = (item: typeof trade.items[0]): CollectionItem | null =>
    item.collectionItem ?? item.proposerCollection ?? item.receiverCollection ?? null;

  const [myCards, setMyCards] = useState<CollectionItem[]>(() =>
    currentMyItems.map(getCollectionItem).filter(Boolean) as CollectionItem[]
  );
  const [myCollection, setMyCollection] = useState<CollectionItem[]>([]);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);
  const [cashAdd, setCashAdd] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Reset to current trade state
      setMyCards(currentMyItems.map(getCollectionItem).filter(Boolean) as CollectionItem[]);
      setCashAdd("");
      setCounterMessage("");
      setError("");
      loadMyCollection();
    }
  }, [isOpen]);

  const loadMyCollection = async () => {
    setIsLoadingCollection(true);
    try {
      const result = await collectionApi.getMyCollection(1, 200);
      setMyCollection(result.data.filter((item) => item.status === "AVAILABLE"));
    } catch {
      // silently fail — user can still work with pre-populated cards
    } finally {
      setIsLoadingCollection(false);
    }
  };

  const addCard = (card: CollectionItem) => {
    if (!myCards.find((c) => c.id === card.id)) {
      setMyCards([...myCards, card]);
    }
  };

  const removeCard = (cardId: string) => {
    setMyCards(myCards.filter((c) => c.id !== cardId));
  };

  const cashAddNumber = parseFloat(cashAdd) || 0;

  // Trade balance from current user's perspective
  const myTotal = myCards.reduce((s, c) => s + (c.askingValueOverride ?? c.currentMarketValue ?? 0), 0);
  const theirCards = currentTheirItems.map(getCollectionItem).filter(Boolean) as CollectionItem[];
  const theirTotal = theirCards.reduce((s, c) => s + (c.askingValueOverride ?? c.currentMarketValue ?? 0), 0);
  const netValue = theirTotal - (myTotal + cashAddNumber);
  const isEven = Math.abs(netValue) < 0.5;

  // Cards already in the trade (locked) — exclude from "available to add" list
  const lockedInThisTrade = new Set(
    currentMyItems.map((i) => i.collectionItemId)
  );
  const availableToAdd = myCollection.filter(
    (c) => !myCards.find((mc) => mc.id === c.id) && !lockedInThisTrade.has(c.id)
  );

  const handleSubmit = async () => {
    if (myCards.length === 0) {
      setError("You must include at least one card on your side.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const payload = isProposer
        ? {
            proposerCollectionItemIds: myCards.map((c) => c.id),
            proposerCashAdd: cashAddNumber > 0 ? cashAddNumber : undefined,
          }
        : {
            receiverCollectionItemIds: myCards.map((c) => c.id),
            receiverCashAdd: cashAddNumber > 0 ? cashAddNumber : undefined,
          };

      await tradesApi.counter(trade.id, {
        ...payload,
        message: counterMessage.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send counter offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-orange-400">Counter Offer</h2>
            <p className="text-sm text-slate-400 mt-0.5">Edit your cards and cash — Trade #{trade.tradeCode}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* My cards (editable) */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                Your Cards <span className="text-slate-500 font-normal">— edit your side</span>
              </h3>

              {/* Currently in counter */}
              <div className="space-y-2 mb-3">
                {myCards.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-700 rounded-lg">No cards selected — add from below</p>
                ) : (
                  myCards.map((card) => (
                    <div key={card.id} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg p-2">
                      {card.card.imageUrl ? (
                        <img src={card.card.imageUrl} alt={card.card.name} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{card.card.name}</p>
                        <p className="text-xs text-slate-400">{CONDITION_LABELS[card.condition]}</p>
                        {card.askingValueOverride != null ? (
                          <div>
                            <span className="text-xs text-teal-400">${card.askingValueOverride.toFixed(2)}</span>
                            <span className="text-[10px] text-teal-500 ml-1">Owner price</span>
                          </div>
                        ) : (
                          <p className="text-xs text-green-400">${card.currentMarketValue?.toFixed(2) ?? "N/A"}</p>
                        )}
                      </div>
                      <button onClick={() => removeCard(card.id)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add from collection */}
              <p className="text-xs text-slate-500 mb-2">Add from your collection:</p>
              {isLoadingCollection ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                </div>
              ) : availableToAdd.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">No other available cards</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {availableToAdd.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => addCard(card)}
                      className="flex items-center gap-2 bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 rounded-lg p-2 transition-colors text-left"
                    >
                      {card.card.imageUrl ? (
                        <img src={card.card.imageUrl} alt={card.card.name} className="w-8 h-11 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-11 bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                          <Package className="h-3 w-3 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{card.card.name}</p>
                        <p className="text-xs text-slate-500">{CONDITION_LABELS[card.condition]}</p>
                        {card.askingValueOverride != null ? (
                          <div>
                            <span className="text-xs text-teal-400">${card.askingValueOverride.toFixed(2)}</span>
                            <span className="text-[10px] text-teal-500 ml-1">Owner price</span>
                          </div>
                        ) : (
                          <p className="text-xs text-green-400">${card.currentMarketValue?.toFixed(2) ?? "N/A"}</p>
                        )}
                      </div>
                      <Plus className="h-3 w-3 text-orange-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Their cards (read-only) */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                Their Cards <span className="text-slate-500 font-normal">— current offer</span>
              </h3>
              <div className="space-y-2">
                {theirCards.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-700 rounded-lg">No cards on their side</p>
                ) : (
                  theirCards.map((card) => (
                    <div key={card.id} className="flex items-center gap-2 bg-slate-800/30 border border-slate-700/50 rounded-lg p-2">
                      {card.card.imageUrl ? (
                        <img src={card.card.imageUrl} alt={card.card.name} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{card.card.name}</p>
                        <p className="text-xs text-slate-400">{CONDITION_LABELS[card.condition]}</p>
                        {card.askingValueOverride != null ? (
                          <div>
                            <span className="text-xs text-teal-400">${card.askingValueOverride.toFixed(2)}</span>
                            <span className="text-[10px] text-teal-500 ml-1">Owner price</span>
                          </div>
                        ) : (
                          <p className="text-xs text-green-400">${card.currentMarketValue?.toFixed(2) ?? "N/A"}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Cash + balance */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Add Cash to Your Offer (optional)</label>
              <div className="relative max-w-xs">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cashAdd}
                  onChange={(e) => setCashAdd(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </div>

            {/* Trade balance */}
            <div className="space-y-1 pt-2 border-t border-slate-700">
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
              <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                <span className="text-sm font-medium text-slate-300">Trade Balance</span>
                {isEven ? (
                  <span className="flex items-center gap-1.5 text-green-400 font-semibold text-sm">
                    <MinusIcon className="h-3.5 w-3.5" /> Even trade
                  </span>
                ) : netValue > 0 ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-sm">
                    <TrendingUp className="h-3.5 w-3.5" /> You gain ${netValue.toFixed(2)} in value
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-blue-400 font-semibold text-sm">
                    <TrendingDown className="h-3.5 w-3.5" /> They gain ${Math.abs(netValue).toFixed(2)} in value
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Message (optional)</label>
            <textarea
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Explain your counter offer..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || myCards.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="h-4 w-4" /> Send Counter Offer</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
