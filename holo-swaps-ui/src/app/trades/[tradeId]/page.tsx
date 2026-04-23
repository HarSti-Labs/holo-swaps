"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { tradesApi } from "@/lib/api/trades";
import { Trade, TradeStatus, TradeSnapshot } from "@/types";
import {
  Loader2,
  Package,
  ArrowRight,
  Check,
  X,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Truck,
  Star,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { CONDITION_LABELS } from "@/types";
import { CounterOfferModal } from "@/components/trades/CounterOfferModal";

const STATUS_LABELS: Record<TradeStatus, string> = {
  PROPOSED: "Proposed",
  COUNTERED: "Counter Offer",
  ACCEPTED: "Accepted",
  BOTH_SHIPPED: "Both Shipped",
  A_RECEIVED: "Partially Received",
  B_RECEIVED: "Partially Received",
  BOTH_RECEIVED: "Both Received",
  VERIFIED: "Verified",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<TradeStatus, string> = {
  PROPOSED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COUNTERED: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ACCEPTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  BOTH_SHIPPED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  A_RECEIVED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  B_RECEIVED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  BOTH_RECEIVED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VERIFIED: "bg-green-500/20 text-green-400 border-green-500/30",
  COMPLETED: "bg-green-600/20 text-green-400 border-green-600/30",
  DISPUTED: "bg-red-500/20 text-red-400 border-red-500/30",
  CANCELLED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const tradeId = params.tradeId as string;

  const [trade, setTrade] = useState<Trade | null>(null);
  const [snapshots, setSnapshots] = useState<TradeSnapshot[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  // Shipping form state
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("USPS");
  const [isInsured, setIsInsured] = useState(false);
  const [insuredValue, setInsuredValue] = useState("");
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Payment state
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<"success" | "cancelled" | null>(null);

  // Receipt / review state
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(-1);
  const messagesInitializedRef = useRef(false);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success" || payment === "cancelled") {
      setPaymentBanner(payment);
      // Remove query param from URL without navigating
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadTrade();
      loadMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [user, tradeId]);

  useEffect(() => {
    // messageCountRef starts at -1; first two fires (empty [] then first API response)
    // are treated as baseline — only scroll when count grows after that
    if (messageCountRef.current === -1) {
      // Initial render with empty array — set to 0 as sentinel
      messageCountRef.current = 0;
      return;
    }
    if (!messagesInitializedRef.current) {
      // First real API response — record baseline, don't scroll
      messagesInitializedRef.current = true;
      messageCountRef.current = messages.length;
      return;
    }
    if (messages.length > messageCountRef.current) {
      scrollToBottom();
    }
    messageCountRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const loadSnapshots = async () => {
    try {
      const data = await tradesApi.getSnapshots(tradeId);
      setSnapshots(data);
    } catch (err) {
      console.error("Failed to load snapshots:", err);
    }
  };

  const loadTrade = async () => {
    setIsLoading(true);
    loadSnapshots();
    try {
      const data = await tradesApi.getById(tradeId);
      setTrade(data);
    } catch (err: any) {
      console.error("Failed to load trade:", err);
      if (err.response?.status === 404 || err.response?.status === 403) {
        router.push("/trades");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await tradesApi.getMessages(tradeId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSendingMessage(true);
    try {
      await tradesApi.sendMessage(tradeId, newMessage);
      setNewMessage("");
      await loadMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleAccept = async () => {
    setActionError(null);
    setIsAccepting(true);
    try {
      await tradesApi.accept(tradeId);
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to accept trade");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this trade?")) return;

    setActionError(null);
    setIsDeclining(true);
    try {
      await tradesApi.decline(tradeId);
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to decline trade");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this trade?")) return;

    setActionError(null);
    setIsCancelling(true);
    try {
      await tradesApi.cancel(tradeId);
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to cancel trade");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    setTrackingError(null);
    setIsSubmittingTracking(true);
    try {
      await tradesApi.submitTracking(tradeId, {
        trackingNumber: trackingNumber.trim(),
        carrier,
        isInsured,
        insuredValue: isInsured && insuredValue ? parseFloat(insuredValue) : undefined,
      });
      await loadTrade();
    } catch (err: any) {
      setTrackingError(err.response?.data?.message || "Failed to submit tracking");
    } finally {
      setIsSubmittingTracking(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!confirm("Confirm that you have received the cards at the verification center?")) return;
    setActionError(null);
    setIsConfirmingReceipt(true);
    try {
      await tradesApi.confirmReceipt(tradeId);
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to confirm receipt");
    } finally {
      setIsConfirmingReceipt(false);
    }
  };

  const handleCompletePayment = async () => {
    setActionError(null);
    setIsLoadingCheckout(true);
    try {
      const checkoutUrl = await tradesApi.getCheckoutUrl(tradeId);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to load payment page");
      setIsLoadingCheckout(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating === 0) return;
    setActionError(null);
    setIsSubmittingReview(true);
    try {
      await tradesApi.submitReview(tradeId, { rating: reviewRating, comment: reviewComment || undefined });
      setReviewSubmitted(true);
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
          <p className="text-center text-slate-400">Please log in to view this trade</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  if (!trade) {
    return null;
  }

  const otherUser = trade.proposer.id === user.id ? trade.receiver : trade.proposer;
  const isProposer = trade.proposer.id === user.id;
  const myItems = trade.items.filter((i) => i.ownedByProposer === isProposer);
  const theirItems = trade.items.filter((i) => i.ownedByProposer !== isProposer);

  // Can accept/decline when it's your turn — i.e. the other party made the last move
  const isMyTurn = ["PROPOSED", "COUNTERED"].includes(trade.status) && trade.lastActionById !== user.id;
  const canAccept = isMyTurn;
  const canDecline = isMyTurn;
  const canCancel = ["PROPOSED", "COUNTERED"].includes(trade.status);
  const canCounter = ["PROPOSED", "COUNTERED"].includes(trade.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/trades")}
            className="text-slate-400 hover:text-white mb-4 transition-colors"
          >
            ← Back to Trades
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Trade #{trade.tradeCode}</h1>
              <p className="text-slate-400">
                With {otherUser.username} •{" "}
                {new Date(trade.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium border ${
                STATUS_COLORS[trade.status]
              }`}
            >
              {STATUS_LABELS[trade.status]}
            </div>
          </div>
        </div>

        {/* ── Progress Stepper (full width, compact) ── */}
        {(() => {
          const steps = [
            { label: "Proposed",  statuses: ["PROPOSED", "COUNTERED"] },
            { label: "Accepted",  statuses: ["ACCEPTED"] },
            { label: "Shipped",   statuses: ["BOTH_SHIPPED"] },
            { label: "Received",  statuses: ["A_RECEIVED", "B_RECEIVED", "BOTH_RECEIVED"] },
            { label: "Verified",  statuses: ["VERIFIED"] },
            { label: "Complete",  statuses: ["COMPLETED"] },
          ];
          const currentIdx = steps.findIndex((s) => s.statuses.includes(trade.status));
          if (trade.status === "CANCELLED" || trade.status === "DISPUTED") {
            return (
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${trade.status === "DISPUTED" ? "bg-red-950/30 border-red-500/30 text-red-400" : "bg-slate-800/50 border-slate-700 text-slate-400"}`}>
                <AlertCircle size={14} />
                {trade.status === "DISPUTED" ? "This trade is under dispute" : "This trade was cancelled"}
              </div>
            );
          }
          return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-5 py-3">
              <div className="flex items-center">
                {steps.map((step, i) => (
                  <div key={step.label} className="flex items-center flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        i < currentIdx ? "bg-green-500 text-white" :
                        i === currentIdx ? "bg-blue-500 text-white" :
                        "bg-slate-700 text-slate-500"
                      }`}>
                        {i < currentIdx ? <Check size={10} /> : i + 1}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${
                        i === currentIdx ? "text-blue-400" : i < currentIdx ? "text-green-400" : "text-slate-500"
                      }`}>{step.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-px mx-2 ${i < currentIdx ? "bg-green-500" : "bg-slate-700"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {actionError && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-500/30 rounded-xl p-4 mt-4">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 flex-1">{actionError}</p>
            <button onClick={() => setActionError(null)} className="text-slate-500 hover:text-white flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Trade Details - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cards Being Traded */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Trade Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Your Cards */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">
                    You're Trading
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {myItems.map((item) => {
                      const card =
                        (item as any).collectionItem ?? item.proposerCollection ?? item.receiverCollection;
                      if (!card) return null;

                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 bg-slate-800/50 rounded-lg p-3"
                        >
                          {card.card.imageUrl ? (
                            <img
                              src={card.card.imageUrl}
                              alt={card.card.name}
                              className="w-16 h-20 object-cover rounded flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-20 bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                              <Package className="h-8 w-8 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {card.card.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {card.card.setName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {CONDITION_LABELS[card.condition]}
                              {card.isFoil && " • Foil"}
                            </p>
                            {card.askingValueOverride != null ? (
                              <div className="mt-1">
                                <span className="text-xs text-teal-400">${card.askingValueOverride.toFixed(2)}</span>
                                <span className="text-[10px] text-teal-500 ml-1">Owner price</span>
                              </div>
                            ) : (
                              <p className="text-xs text-green-400 mt-1">
                                ${card.currentMarketValue?.toFixed(2) || "N/A"}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Their Cards */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">
                    You're Receiving
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {theirItems.map((item) => {
                      const card =
                        (item as any).collectionItem ?? item.proposerCollection ?? item.receiverCollection;
                      if (!card) return null;

                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 bg-slate-800/50 rounded-lg p-3"
                        >
                          {card.card.imageUrl ? (
                            <img
                              src={card.card.imageUrl}
                              alt={card.card.name}
                              className="w-16 h-20 object-cover rounded flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-20 bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                              <Package className="h-8 w-8 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {card.card.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {card.card.setName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {CONDITION_LABELS[card.condition]}
                              {card.isFoil && " • Foil"}
                            </p>
                            {card.askingValueOverride != null ? (
                              <div className="mt-1">
                                <span className="text-xs text-teal-400">${card.askingValueOverride.toFixed(2)}</span>
                                <span className="text-[10px] text-teal-500 ml-1">Owner price</span>
                              </div>
                            ) : (
                              <p className="text-xs text-green-400 mt-1">
                                ${card.currentMarketValue?.toFixed(2) || "N/A"}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Trade Summary — always aligned at the bottom */}
              {(() => {
                const PLATFORM_FEE_RATE = 0.025;
                const getItemValue = (item: typeof trade.items[0]) => {
                  const c = (item as any).collectionItem ?? item.proposerCollection ?? item.receiverCollection;
                  return (c?.askingValueOverride ?? c?.currentMarketValue ?? 0) as number;
                };
                const myMarketValue = myItems.reduce((sum, item) => sum + getItemValue(item), 0);
                const theirMarketValue = theirItems.reduce((sum, item) => sum + getItemValue(item), 0);
                const iPayCash = trade.cashDifference > 0 && trade.cashPayerId === user.id;
                const theyPayCash = trade.cashDifference > 0 && trade.cashPayerId !== user.id;
                const myTotal = myMarketValue + (iPayCash ? trade.cashDifference : 0);
                const theirTotal = theirMarketValue + (theyPayCash ? trade.cashDifference : 0);
                const netValue = theirTotal - myTotal;
                const isEven = Math.abs(netValue) < 0.5;
                // Each party pays 2.5% of the value they RECEIVE (receiver pays model)
                const myFee = theirTotal * PLATFORM_FEE_RATE;
                return (
                  <div className="mt-6 pt-5 border-t border-slate-700 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">You're offering</p>
                        <p className="text-lg font-bold text-white">${myMarketValue.toFixed(2)}</p>
                        {iPayCash && (
                          <p className="text-xs text-amber-400 mt-0.5">+ ${trade.cashDifference.toFixed(2)} cash</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">{myItems.length} card{myItems.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">You're receiving</p>
                        <p className="text-lg font-bold text-white">${theirMarketValue.toFixed(2)}</p>
                        {theyPayCash && (
                          <p className="text-xs text-green-400 mt-0.5">+ ${trade.cashDifference.toFixed(2)} cash from them</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">{theirItems.length} card{theirItems.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm text-slate-400">Trade Balance</span>
                      {isEven ? (
                        <span className="text-sm font-semibold text-green-400">Even trade</span>
                      ) : netValue > 0 ? (
                        <span className="text-sm font-semibold text-amber-400">You gain ${netValue.toFixed(2)} in value</span>
                      ) : (
                        <span className="text-sm font-semibold text-blue-400">They gain ${Math.abs(netValue).toFixed(2)} in value</span>
                      )}
                    </div>
                    {/* Platform fee */}
                    <div className="flex items-center justify-between px-1 pt-2 border-t border-slate-700">
                      <span className="text-sm text-slate-400">
                        Your platform fee <span className="text-slate-500 text-xs">(2.5% of ${theirTotal.toFixed(2)} you receive)</span>
                      </span>
                      <span className="text-sm font-semibold text-purple-400">${myFee.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 px-1">
                      Each party pays 2.5% of the value they receive. Collected at completion.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Trade History */}
            {snapshots.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Offer History</h2>
                <div className="space-y-4">
                  {[...snapshots].reverse().map((snap) => {
                    const isMe = snap.actionBy.id === user.id;
                    const proposerItems = snap.items.filter((i: any) => i.ownedByProposer);
                    const receiverItems = snap.items.filter((i: any) => !i.ownedByProposer);
                    return (
                      <div key={snap.id} className={`rounded-xl border p-4 ${snap.round === snapshots.length ? "border-blue-500/40 bg-blue-950/20" : "border-slate-700 bg-slate-800/30"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${snap.round === snapshots.length ? "bg-blue-500/20 text-blue-300" : "bg-slate-700 text-slate-400"}`}>
                              {snap.label}
                            </span>
                            <span className="text-xs text-slate-500">by {isMe ? "You" : snap.actionBy.username}</span>
                          </div>
                          <span className="text-xs text-slate-500">{new Date(snap.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] text-slate-500 mb-1.5">{trade.proposer.username}'s cards</p>
                            <div className="space-y-1">
                              {proposerItems.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  {item.cardImageUrl && <img src={item.cardImageUrl} alt={item.cardName} className="w-7 h-9 object-cover rounded flex-shrink-0" />}
                                  <div className="min-w-0">
                                    <p className="text-xs text-white truncate">{item.cardName}</p>
                                    {item.valueAtTime != null && <p className="text-[10px] text-green-400">${item.valueAtTime.toFixed(2)}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500 mb-1.5">{trade.receiver.username}'s cards</p>
                            <div className="space-y-1">
                              {receiverItems.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  {item.cardImageUrl && <img src={item.cardImageUrl} alt={item.cardName} className="w-7 h-9 object-cover rounded flex-shrink-0" />}
                                  <div className="min-w-0">
                                    <p className="text-xs text-white truncate">{item.cardName}</p>
                                    {item.valueAtTime != null && <p className="text-[10px] text-green-400">${item.valueAtTime.toFixed(2)}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {snap.cashDifference > 0 && (
                          <p className="text-xs text-amber-400 mt-2">
                            + ${snap.cashDifference.toFixed(2)} cash {snap.cashPayerId === trade.proposer.id ? `from ${trade.proposer.username}` : `from ${trade.receiver.username}`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {(canAccept || canDecline || canCancel || canCounter) && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  {canAccept && (
                    <button
                      onClick={handleAccept}
                      disabled={isAccepting}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {isAccepting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Accept Trade
                        </>
                      )}
                    </button>
                  )}
                  {canCounter && (
                    <button
                      onClick={() => setShowCounterModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Counter Offer
                    </button>
                  )}
                  {canDecline && (
                    <button
                      onClick={handleDecline}
                      disabled={isDeclining}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {isDeclining ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Declining...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Decline
                        </>
                      )}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={handleCancel}
                      disabled={isCancelling}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Cancel Trade
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* ── Payment banners ── */}
          {paymentBanner === "success" && (
            <div className="bg-green-950/40 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-300">Payment successful!</p>
                <p className="text-xs text-slate-400 mt-0.5">Your payment is held in escrow and will be released when the trade completes verification.</p>
              </div>
              <button onClick={() => setPaymentBanner(null)} className="ml-auto text-slate-500 hover:text-white"><X size={14} /></button>
            </div>
          )}
          {paymentBanner === "cancelled" && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">Payment cancelled</p>
                <p className="text-xs text-slate-400 mt-0.5">You can complete payment below whenever you're ready.</p>
              </div>
              <button onClick={() => setPaymentBanner(null)} className="ml-auto text-slate-500 hover:text-white"><X size={14} /></button>
            </div>
          )}

          {/* ── Per-party payment section (ACCEPTED) ── */}
          {trade.status === "ACCEPTED" && (() => {
            const PLATFORM_FEE_RATE = 0.025;
            const myIsProposer = trade.proposer.id === user.id;
            const iCashPayer = trade.cashPayerId === user.id;
            const theyAreCashPayer = trade.cashPayerId === otherUser.id;

            // Use item-level values (same as trade details section) for accuracy
            const getItemValue = (item: typeof trade.items[0]) => {
              const c = (item as any).collectionItem ?? item.proposerCollection ?? item.receiverCollection;
              return (c?.askingValueOverride ?? c?.currentMarketValue ?? 0) as number;
            };
            const theirCardsValue = theirItems.reduce((sum, item) => sum + getItemValue(item), 0);

            // My total receive value = their card value + any cash they send me
            const myReceiveValue = theirCardsValue + (theyAreCashPayer ? trade.cashDifference : 0);
            const myFee = myReceiveValue * PLATFORM_FEE_RATE;
            const myTotal = myFee + (iCashPayer ? trade.cashDifference : 0);

            // Did I already pay?
            const myIntentId = myIsProposer ? trade.stripeProposerIntentId : trade.stripeReceiverIntentId;
            const theirIntentId = myIsProposer ? trade.stripeReceiverIntentId : trade.stripeProposerIntentId;
            const iPaid = !!myIntentId;
            const theyPaid = !!theirIntentId;

            return (
              <div className="space-y-3">
                {/* My payment */}
                {!iPaid ? (
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <CreditCard size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-300">Your payment is required</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Platform fee: <span className="text-white">${myFee.toFixed(2)}</span>
                          {iCashPayer && <> + cash to {otherUser.username}: <span className="text-white">${trade.cashDifference.toFixed(2)}</span></>}
                          {" "}= <span className="text-white font-semibold">${myTotal.toFixed(2)} total</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">Funds are held in escrow until the trade is verified and completed.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCompletePayment}
                      disabled={isLoadingCheckout}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {isLoadingCheckout ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                      {isLoadingCheckout ? "Loading..." : `Complete My Payment — $${myTotal.toFixed(2)}`}
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-950/30 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-300">Your payment is complete</p>
                      <p className="text-xs text-slate-400 mt-0.5">${myTotal.toFixed(2)} held in escrow — releases on trade completion.</p>
                    </div>
                  </div>
                )}

                {/* Their payment status */}
                {!theyPaid ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
                    <Clock size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400"><span className="text-slate-300 font-medium">{otherUser.username}</span> hasn't completed their payment yet. Shipping will unlock once both payments are confirmed.</p>
                  </div>
                ) : (
                  <div className="bg-green-950/20 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400"><span className="text-slate-300 font-medium">{otherUser.username}</span>'s payment is confirmed.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Shipping phase ── */}
          {["ACCEPTED", "BOTH_SHIPPED", "A_RECEIVED", "B_RECEIVED", "BOTH_RECEIVED"].includes(trade.status) && (() => {
            const myShipment = trade.shipments?.find((s) => s.senderId === user.id && s.direction === "INBOUND");
            const theirShipment = trade.shipments?.find((s) => s.senderId !== user.id && s.direction === "INBOUND");
            const bothPaid = !!(trade.stripeProposerIntentId && trade.stripeReceiverIntentId);
            const VERIFICATION_ADDRESS = "HoloSwaps Verification Center\n123 Card Ave, Suite 100\nLos Angeles, CA 90001";

            return (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Truck size={20} className="text-blue-400" />
                  Shipping
                </h2>

                {/* Payment gate */}
                {!bothPaid && (
                  <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-500/20 rounded-lg p-4">
                    <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300">Both parties must complete payment before shipping can begin.</p>
                  </div>
                )}

                {/* Shipping instructions + address */}
                <div className={`bg-slate-800/50 rounded-lg p-4 ${!bothPaid ? "opacity-40 pointer-events-none select-none" : ""}`}>
                  <p className="text-sm font-semibold text-white mb-1">Ship your cards to:</p>
                  <pre className="text-sm text-slate-300 font-sans whitespace-pre-wrap">{VERIFICATION_ADDRESS}</pre>
                  <ul className="mt-3 space-y-1 text-xs text-slate-400 list-disc list-inside">
                    <li>Use a rigid top-loader or card sleeve inside a padded envelope</li>
                    <li>Include your trade code <span className="text-white font-mono">{trade.tradeCode}</span> on a slip inside</li>
                    <li>We recommend insuring cards over $50</li>
                  </ul>
                </div>

                {/* Your tracking */}
                {!bothPaid ? null : myShipment ? (
                  <div className="flex items-start gap-3 bg-green-950/30 border border-green-500/30 rounded-lg p-4">
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-300">Your tracking submitted</p>
                      <p className="text-xs text-slate-400 mt-0.5">{myShipment.carrier} · {myShipment.trackingNumber}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Status: {myShipment.status}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTracking} className="space-y-3">
                    <p className="text-sm font-semibold text-white">Submit your tracking number</p>
                    {trackingError && <p className="text-xs text-red-400">{trackingError}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Carrier</label>
                        <select
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {["USPS", "UPS", "FedEx", "DHL", "Other"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Tracking Number</label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="e.g. 9400111899..."
                          required
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInsured}
                          onChange={(e) => setIsInsured(e.target.checked)}
                          className="rounded"
                        />
                        Insured shipment
                      </label>
                      {isInsured && (
                        <input
                          type="number"
                          value={insuredValue}
                          onChange={(e) => setInsuredValue(e.target.value)}
                          placeholder="Insured value ($)"
                          min="0"
                          className="w-36 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingTracking || !trackingNumber.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {isSubmittingTracking ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                      Submit Tracking
                    </button>
                  </form>
                )}

                {/* Their tracking status */}
                <div className={`flex items-start gap-3 rounded-lg p-3 ${theirShipment ? "bg-green-950/20 border border-green-500/20" : "bg-slate-800/40 border border-slate-700"}`}>
                  {theirShipment ? <CheckCircle size={15} className="text-green-400 mt-0.5 flex-shrink-0" /> : <Clock size={15} className="text-slate-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="text-xs font-semibold text-slate-300">{otherUser.username}'s shipment</p>
                    {theirShipment ? (
                      <p className="text-xs text-slate-400 mt-0.5">{theirShipment.carrier} · {theirShipment.trackingNumber} · <span className="text-slate-300">{theirShipment.status}</span></p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">Waiting for them to submit tracking</p>
                    )}
                  </div>
                </div>

                {/* Manual receipt confirmation (fallback if AfterShip doesn't detect it) */}
                {["BOTH_SHIPPED", "A_RECEIVED", "B_RECEIVED"].includes(trade.status) && (() => {
                  const inboundToMe = trade.shipments?.find((s) => s.senderId !== user.id && s.direction === "INBOUND");
                  const alreadyConfirmed = inboundToMe?.status === "DELIVERED";
                  return (
                    <div className="border-t border-slate-700 pt-4">
                      <p className="text-sm font-semibold text-white mb-1">Manual receipt confirmation</p>
                      <p className="text-xs text-slate-400 mb-3">
                        If the carrier tracking doesn't update automatically, our team can manually confirm receipt.
                        Only use this if you work at the verification center.
                      </p>
                      <button
                        onClick={handleConfirmReceipt}
                        disabled={isConfirmingReceipt || alreadyConfirmed}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {isConfirmingReceipt ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        {alreadyConfirmed ? "Receipt Confirmed" : "Confirm Receipt (Admin)"}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* ── Review section (COMPLETED) ── */}
          {trade.status === "COMPLETED" && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Star size={20} className="text-yellow-400" />
                Leave a Review
              </h2>
              {reviewSubmitted ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle size={16} />
                  Thanks! Your review has been submitted.
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-2">How was your experience trading with <span className="text-white">{otherUser.username}</span>?</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className={`text-2xl transition-colors ${star <= reviewRating ? "text-yellow-400" : "text-slate-600 hover:text-yellow-600"}`}
                        >
                          ★
                        </button>
                      ))}
                      {reviewRating > 0 && (
                        <span className="text-sm text-slate-400 self-center ml-1">
                          {["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating]}
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share details about your experience (optional)"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReview || reviewRating === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isSubmittingReview ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                    Submit Review
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Messages - Right Side */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
              {/* Messages Header */}
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold">Trade Chat</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Messages are only visible to you and {otherUser.username}
                </p>
              </div>

              {/* Messages List */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMyMessage = msg.senderId === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          isMyMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isMyMessage
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-100"
                          }`}
                        >
                          <p className="text-sm">{msg.body}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMyMessage
                                ? "text-blue-200"
                                : "text-slate-500"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-slate-800"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSendingMessage}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isSendingMessage ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {trade && (
        <CounterOfferModal
          isOpen={showCounterModal}
          onClose={() => setShowCounterModal(false)}
          trade={trade}
          currentUserId={user.id}
          onSuccess={loadTrade}
        />
      )}
    </div>
  );
}
