"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { tradesApi } from "@/lib/api/trades";
import { Trade, TradeStatus } from "@/types";
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
  const { user } = useAuthStore();
  const tradeId = params.tradeId as string;

  const [trade, setTrade] = useState<Trade | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(0);
  const messagesInitializedRef = useRef(false);

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
    if (!messagesInitializedRef.current) {
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadTrade = async () => {
    setIsLoading(true);
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
    setIsAccepting(true);
    try {
      await tradesApi.accept(tradeId);
      await loadTrade();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to accept trade");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this trade?")) return;

    setIsDeclining(true);
    try {
      await tradesApi.decline(tradeId);
      await loadTrade();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to decline trade");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this trade?")) return;

    setIsCancelling(true);
    try {
      await tradesApi.cancel(tradeId);
      await loadTrade();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel trade");
    } finally {
      setIsCancelling(false);
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

  const canAccept = trade.status === "PROPOSED" && !isProposer;
  const canDecline = trade.status === "PROPOSED" && !isProposer;
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                            <p className="text-xs text-green-400 mt-1">
                              ${card.currentMarketValue?.toFixed(2) || "N/A"}
                            </p>
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
                            <p className="text-xs text-green-400 mt-1">
                              ${card.currentMarketValue?.toFixed(2) || "N/A"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Trade Summary — always aligned at the bottom */}
              {(() => {
                const myMarketValue = isProposer ? trade.proposerMarketValue : trade.receiverMarketValue;
                const theirMarketValue = isProposer ? trade.receiverMarketValue : trade.proposerMarketValue;
                const iPayCash = trade.cashDifference > 0 && trade.cashPayerId === user.id;
                const theyPayCash = trade.cashDifference > 0 && trade.cashPayerId !== user.id;
                const myTotal = myMarketValue + (iPayCash ? trade.cashDifference : 0);
                const theirTotal = theirMarketValue + (theyPayCash ? trade.cashDifference : 0);
                const netValue = theirTotal - myTotal;
                const isEven = Math.abs(netValue) < 0.5;
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
                        <span className="text-sm font-semibold text-blue-400">+${netValue.toFixed(2)} in your favor</span>
                      ) : (
                        <span className="text-sm font-semibold text-amber-400">+${Math.abs(netValue).toFixed(2)} in their favor</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

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

          {/* Messages - Right Side */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px] sticky top-4">
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
