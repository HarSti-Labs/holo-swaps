"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { tradesApi } from "@/lib/api/trades";
import { Trade, TradeStatus } from "@/types";
import { Loader2, Package, ArrowRight, Clock } from "lucide-react";
import { getInitials } from "@/lib/utils";

const STATUS_LABELS: Record<TradeStatus, string> = {
  PROPOSED: "Proposed",
  COUNTERED: "Counter Offer",
  ACCEPTED: "Accepted",
  BOTH_SHIPPED: "Shipped",
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

export default function TradesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initialFilter = (searchParams.get("filter") as "all" | "active" | "completed") ?? "all";
  const [filter, setFilter] = useState<"all" | "active" | "completed">(
    ["all", "active", "completed"].includes(initialFilter) ? initialFilter : "all"
  );

  useEffect(() => {
    if (user) {
      loadTrades();
    }
  }, [user, filter]);

  const loadTrades = async () => {
    setIsLoading(true);
    try {
      const result = await tradesApi.getMyTrades({ page: 1, limit: 50 });
      let filtered = result.data;

      if (filter === "active") {
        filtered = filtered.filter((t) =>
          ["PROPOSED", "COUNTERED", "ACCEPTED", "BOTH_SHIPPED", "A_RECEIVED", "B_RECEIVED", "BOTH_RECEIVED"].includes(t.status)
        );
      } else if (filter === "completed") {
        filtered = filtered.filter((t) =>
          ["COMPLETED", "CANCELLED", "DISPUTED"].includes(t.status)
        );
      }

      setTrades(filtered);
    } catch (err) {
      console.error("Failed to load trades:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getOtherUser = (trade: Trade) => {
    return trade.proposer.id === user?.id ? trade.receiver : trade.proposer;
  };

  const getTradeDirection = (trade: Trade) => {
    return trade.proposer.id === user?.id ? "sent" : "received";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
          <p className="text-center text-slate-400">Please log in to view your trades</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Trades</h1>
          <p className="text-slate-400">Manage your active and past trades</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 border-b border-slate-800">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === "all"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            All Trades
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === "active"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === "completed"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Trades List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : trades.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No trades found</p>
            <p className="text-sm text-slate-400">
              {filter === "all"
                ? "Start trading by browsing other users' collections"
                : filter === "active"
                ? "You don't have any active trades"
                : "You haven't completed any trades yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map((trade) => {
              const otherUser = getOtherUser(trade);
              const direction = getTradeDirection(trade);
              const myItems = trade.items.filter((i) => i.ownedByProposer === (direction === "sent"));
              const theirItems = trade.items.filter((i) => i.ownedByProposer !== (direction === "sent"));

              const getItemValue = (item: typeof trade.items[0]) => {
                const c = item.collectionItem ?? item.proposerCollection ?? item.receiverCollection;
                return (c?.askingValueOverride ?? c?.currentMarketValue ?? 0) as number;
              };
              const myValue = myItems.reduce((sum, item) => sum + getItemValue(item), 0);
              const theirValue = theirItems.reduce((sum, item) => sum + getItemValue(item), 0);

              return (
                <div
                  key={trade.id}
                  onClick={() => router.push(`/trades/${trade.id}`)}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {getInitials(otherUser.username)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">
                          Trade with {otherUser.username}
                        </p>
                        <p className="text-sm text-slate-400">
                          {direction === "sent" ? "You proposed" : "They proposed"} •{" "}
                          {new Date(trade.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[trade.status]}`}>
                      {STATUS_LABELS[trade.status]}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Your Cards */}
                    <div>
                      <p className="text-xs text-slate-400 mb-2">You're trading</p>
                      <div className="flex flex-wrap gap-1">
                        {myItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="bg-slate-800 rounded px-2 py-1 text-xs truncate max-w-[120px]"
                          >
                            {item.collectionItem?.card.name || item.proposerCollection?.card.name || item.receiverCollection?.card.name}
                          </div>
                        ))}
                        {myItems.length > 3 && (
                          <div className="bg-slate-800 rounded px-2 py-1 text-xs text-slate-400">
                            +{myItems.length - 3} more
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        ${myValue.toFixed(2)}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="h-6 w-6 text-slate-400" />
                    </div>

                    {/* Their Cards */}
                    <div>
                      <p className="text-xs text-slate-400 mb-2">You're receiving</p>
                      <div className="flex flex-wrap gap-1">
                        {theirItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="bg-slate-800 rounded px-2 py-1 text-xs truncate max-w-[120px]"
                          >
                            {item.collectionItem?.card.name || item.proposerCollection?.card.name || item.receiverCollection?.card.name}
                          </div>
                        ))}
                        {theirItems.length > 3 && (
                          <div className="bg-slate-800 rounded px-2 py-1 text-xs text-slate-400">
                            +{theirItems.length - 3} more
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        ${theirValue.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Actions needed indicator */}
                  {["PROPOSED", "COUNTERED"].includes(trade.status) && trade.lastActionById !== user?.id && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-yellow-400">
                      <Clock className="h-4 w-4" />
                      {trade.status === "COUNTERED" ? "Action needed: Review counter offer" : "Action needed: Review and respond"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
