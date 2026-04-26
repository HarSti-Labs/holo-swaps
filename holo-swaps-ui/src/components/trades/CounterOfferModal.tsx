"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, Package, Send, Loader2, DollarSign, TrendingUp, TrendingDown, Minus as MinusIcon, Search } from "lucide-react";
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

function CardRow({ card, onAdd, onRemove }: { card: CollectionItem; onAdd?: () => void; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg p-2">
      {card.card.imageUrl ? (
        <img src={card.card.imageUrl} alt={card.card.name} className="w-10 h-14 object-cover rounded flex-shrink-0" />
      ) : (
        <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
          <Package className="h-4 w-4 text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium truncate">{card.card.name}</p>
        <p className="text-base text-slate-400">{card.card.setName}</p>
        <p className="text-base text-slate-500">{CONDITION_LABELS[card.condition]}</p>
        {card.askingValueOverride != null ? (
          <span className="text-base text-teal-400">${card.askingValueOverride.toFixed(2)}</span>
        ) : (
          <span className="text-base text-green-400">${card.currentMarketValue?.toFixed(2) ?? "N/A"}</span>
        )}
      </div>
      {onRemove && (
        <button onClick={onRemove} className="text-red-400 hover:text-red-300 flex-shrink-0 p-1">
          <Minus className="h-4 w-4" />
        </button>
      )}
      {onAdd && (
        <button onClick={onAdd} className="text-orange-400 hover:text-orange-300 flex-shrink-0 p-1">
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function CounterOfferModal({ isOpen, onClose, trade, currentUserId, onSuccess }: CounterOfferModalProps) {
  const isProposer = trade.proposer.id === currentUserId;
  const otherUser = isProposer ? trade.receiver : trade.proposer;

  const getCollectionItem = (item: typeof trade.items[0]): CollectionItem | null =>
    item.collectionItem ?? item.proposerCollection ?? item.receiverCollection ?? null;

  const currentMyItems = trade.items.filter((i) => i.ownedByProposer === isProposer);
  const currentTheirItems = trade.items.filter((i) => i.ownedByProposer !== isProposer);

  const [myCards, setMyCards] = useState<CollectionItem[]>([]);
  const [theirCards, setTheirCards] = useState<CollectionItem[]>([]);
  const [myCollection, setMyCollection] = useState<CollectionItem[]>([]);
  const [theirCollection, setTheirCollection] = useState<CollectionItem[]>([]);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [isLoadingTheir, setIsLoadingTheir] = useState(false);
  const [mySearch, setMySearch] = useState("");
  const [theirSearch, setTheirSearch] = useState("");
  const [cashAdd, setCashAdd] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMyCards(currentMyItems.map(getCollectionItem).filter(Boolean) as CollectionItem[]);
      setTheirCards(currentTheirItems.map(getCollectionItem).filter(Boolean) as CollectionItem[]);
      setCashAdd("");
      setCounterMessage("");
      setMySearch("");
      setTheirSearch("");
      setError("");
      loadCollections();
    }
  }, [isOpen]);

  const loadCollections = async () => {
    setIsLoadingMy(true);
    setIsLoadingTheir(true);
    const [myResult, theirResult] = await Promise.allSettled([
      collectionApi.getMyCollection(1, 500),
      collectionApi.getUserCollection(otherUser.username, 1, 500),
    ]);
    if (myResult.status === "fulfilled") {
      setMyCollection(myResult.value.data.filter((i) => i.status === "AVAILABLE"));
    }
    if (theirResult.status === "fulfilled") {
      setTheirCollection(theirResult.value.data.filter((i) => i.status === "AVAILABLE"));
    }
    setIsLoadingMy(false);
    setIsLoadingTheir(false);
  };

  const cashAddNumber = parseFloat(cashAdd) || 0;

  const myValue = myCards.reduce((s, c) => s + (c.askingValueOverride ?? c.currentMarketValue ?? 0), 0);
  const theirValue = theirCards.reduce((s, c) => s + (c.askingValueOverride ?? c.currentMarketValue ?? 0), 0);
  const netValue = theirValue - (myValue + cashAddNumber);
  const isEven = Math.abs(netValue) < 0.5;

  const mySelectedIds = new Set(myCards.map((c) => c.id));
  const theirSelectedIds = new Set(theirCards.map((c) => c.id));

  const myAvailable = myCollection.filter((c) => {
    if (mySelectedIds.has(c.id)) return false;
    if (mySearch && !c.card.name.toLowerCase().includes(mySearch.toLowerCase()) && !c.card.setName?.toLowerCase().includes(mySearch.toLowerCase())) return false;
    return true;
  });

  const theirAvailable = theirCollection.filter((c) => {
    if (theirSelectedIds.has(c.id)) return false;
    if (theirSearch && !c.card.name.toLowerCase().includes(theirSearch.toLowerCase()) && !c.card.setName?.toLowerCase().includes(theirSearch.toLowerCase())) return false;
    return true;
  });

  const handleSubmit = async () => {
    if (myCards.length === 0 && theirCards.length === 0) {
      setError("At least one card must be included on each side.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const payload = isProposer
        ? {
            proposerCollectionItemIds: myCards.map((c) => c.id),
            receiverCollectionItemIds: theirCards.map((c) => c.id),
            proposerCashAdd: cashAddNumber > 0 ? cashAddNumber : undefined,
          }
        : {
            receiverCollectionItemIds: myCards.map((c) => c.id),
            proposerCollectionItemIds: theirCards.map((c) => c.id),
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

  const SidePanel = ({
    label,
    username,
    selected,
    available,
    isLoading,
    search,
    onSearchChange,
    onAdd,
    onRemove,
    accentColor,
  }: {
    label: string;
    username: string;
    selected: CollectionItem[];
    available: CollectionItem[];
    isLoading: boolean;
    search: string;
    onSearchChange: (v: string) => void;
    onAdd: (c: CollectionItem) => void;
    onRemove: (id: string) => void;
    accentColor: string;
  }) => (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold text-slate-200">{label}</h3>
        <p className="text-base text-slate-500">{username}</p>
      </div>

      {/* Selected cards */}
      <div className="space-y-1.5 min-h-[60px]">
        {selected.length === 0 ? (
          <p className="text-base text-slate-500 py-3 text-center border border-dashed border-slate-700 rounded-lg">No cards selected</p>
        ) : (
          selected.map((card) => (
            <CardRow key={card.id} card={card} onRemove={() => onRemove(card.id)} />
          ))
        )}
      </div>

      {/* Search + available pool */}
      <div>
        <p className="text-base text-slate-400 mb-1.5">Add from collection:</p>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search cards..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-base"
          />
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          </div>
        ) : available.length === 0 ? (
          <p className="text-base text-slate-500 text-center py-3">{search ? "No matches" : "No available cards"}</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
            {available.map((card) => (
              <CardRow key={card.id} card={card} onAdd={() => onAdd(card)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-orange-400">Counter Offer</h2>
            <p className="text-base text-slate-400 mt-0.5">Edit both sides of the trade — #{trade.tradeCode}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SidePanel
              label="Your Cards"
              username="Your collection"
              selected={myCards}
              available={myAvailable}
              isLoading={isLoadingMy}
              search={mySearch}
              onSearchChange={setMySearch}
              onAdd={(c) => setMyCards((prev) => [...prev, c])}
              onRemove={(id) => setMyCards((prev) => prev.filter((c) => c.id !== id))}
              accentColor="orange"
            />
            <SidePanel
              label={`${otherUser.username}'s Cards`}
              username="Their collection"
              selected={theirCards}
              available={theirAvailable}
              isLoading={isLoadingTheir}
              search={theirSearch}
              onSearchChange={setTheirSearch}
              onAdd={(c) => setTheirCards((prev) => [...prev, c])}
              onRemove={(id) => setTheirCards((prev) => prev.filter((c) => c.id !== id))}
              accentColor="blue"
            />
          </div>

          {/* Cash + balance */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-base font-medium text-slate-300 mb-1">Add Cash to Your Offer (optional)</label>
              <div className="relative max-w-xs">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cashAdd}
                  onChange={(e) => setCashAdd(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
                />
              </div>
            </div>

            {/* Trade balance */}
            <div className="space-y-1 pt-2 border-t border-slate-700">
              <div className="flex items-center justify-between text-base text-slate-400">
                <span>You're offering:</span>
                <span className="text-white font-medium">
                  ${myValue.toFixed(2)}{cashAddNumber > 0 && ` + $${cashAddNumber.toFixed(2)} cash`}
                </span>
              </div>
              <div className="flex items-center justify-between text-base text-slate-400">
                <span>You're receiving:</span>
                <span className="text-white font-medium">${theirValue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                <span className="text-base font-medium text-slate-300">Trade Balance</span>
                {isEven ? (
                  <span className="flex items-center gap-1.5 text-green-400 font-semibold text-base">
                    <MinusIcon className="h-3.5 w-3.5" /> Even trade
                  </span>
                ) : netValue > 0 ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-base">
                    <TrendingUp className="h-3.5 w-3.5" /> You gain ${netValue.toFixed(2)} in value
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-blue-400 font-semibold text-base">
                    <TrendingDown className="h-3.5 w-3.5" /> They gain ${Math.abs(netValue).toFixed(2)} in value
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-base font-medium text-slate-300 mb-1">Message (optional)</label>
            <textarea
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Explain your counter offer..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base resize-none"
            />
          </div>

          {error && <p className="text-base text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (myCards.length === 0 && theirCards.length === 0)}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-base transition-colors"
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
