"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, Package } from "lucide-react";
import { CollectionItem, CONDITION_LABELS } from "@/types";

interface ListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CollectionItem;
  onSave: (askingPrice: number | null, description: string) => Promise<void>;
  onUnlist: () => Promise<void>;
}

export function ListingModal({ isOpen, onClose, item, onSave, onUnlist }: ListingModalProps) {
  const [askingPrice, setAskingPrice] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlisting, setIsUnlisting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAskingPrice(item.askingValueOverride?.toFixed(2) ?? item.currentMarketValue?.toFixed(2) ?? "");
      setDescription(item.listingDescription ?? "");
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(parseFloat(askingPrice) || null, description.trim());
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlist = async () => {
    setIsUnlisting(true);
    try {
      await onUnlist();
      onClose();
    } finally {
      setIsUnlisting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">
            {item.isOpenListing ? "Edit Listing" : "List Card for Offers"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Card context row */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex-shrink-0 w-[60px] h-[80px] bg-slate-700 rounded overflow-hidden">
              {item.card.imageUrl ? (
                <img
                  src={item.card.imageUrl}
                  alt={item.card.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{item.card.name}</p>
              <p className="text-base text-slate-400 truncate mt-0.5">{item.card.setName}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-base font-medium">
                {CONDITION_LABELS[item.condition]}
              </span>
            </div>
          </div>

          {/* Market reference */}
          <div className="flex items-center gap-1.5 text-base text-slate-400">
            <span>Market value: <span className="text-white font-medium">${item.currentMarketValue?.toFixed(2) ?? "N/A"}</span></span>
            <span className="relative group cursor-default">
              <span className="text-slate-400 hover:text-slate-300 transition-colors select-none">ℹ</span>
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-48 bg-slate-800 border border-slate-700 text-slate-300 text-base rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-snug">
                Used in trade balance when no price is set
              </span>
            </span>
          </div>

          {/* Asking price */}
          <div>
            <label className="block text-base font-medium text-slate-300 mb-1.5">
              Your asking price <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="number"
                min={0}
                step={0.01}
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="Leave blank to use market value"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base"
              />
            </div>
            <p className="text-base text-slate-400 mt-1">
              Sets the value used in trade balance calculations for this card
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-base font-medium text-slate-300 mb-1.5">
              Listing description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe card condition, any defects, etc."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-base resize-none"
            />
            <p className="text-base text-slate-400 text-right mt-0.5">{description.length}/500</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-700">
          <div>
            {item.isOpenListing && (
              <button
                onClick={handleUnlist}
                disabled={isUnlisting}
                className="px-4 py-2 border border-red-500/60 text-red-400 hover:bg-red-500/10 rounded-lg text-base font-medium transition-colors disabled:opacity-50"
              >
                {isUnlisting ? "Removing..." : "Remove Listing"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-base transition-colors"
            >
              {isSaving
                ? "Saving..."
                : item.isOpenListing
                ? "Update Listing"
                : "Publish Listing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
