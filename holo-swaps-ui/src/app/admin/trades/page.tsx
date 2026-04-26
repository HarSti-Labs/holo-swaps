"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { api } from "@/lib/api/client";
import { Loader2, Truck, CheckCircle, Clock, AlertCircle, Search } from "lucide-react";

type TradeStatus = "ALL" | "OPEN" | "COMPLETED" | "CANCELLED" | "DISPUTED";

const OPEN_STATUSES = ["ACCEPTED", "BOTH_SHIPPED", "A_RECEIVED", "B_RECEIVED", "BOTH_RECEIVED", "VERIFIED"];

const STATUS_LABELS: Record<string, string> = {
  BOTH_SHIPPED: "Both Shipped",
  A_RECEIVED: "Partially Received",
  B_RECEIVED: "Partially Received",
  BOTH_RECEIVED: "Both Received — Needs Verification",
};

const STATUS_COLORS: Record<string, string> = {
  BOTH_SHIPPED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  A_RECEIVED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  B_RECEIVED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  BOTH_RECEIVED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};


interface Shipment {
  id: string;
  senderId: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  shippedAt: string;
}

interface AdminTrade {
  id: string;
  tradeCode: string;
  status: string;
  proposer: { id: string; username: string };
  receiver: { id: string; username: string };
  shipments: Shipment[];
  updatedAt: string;
}

export default function AdminTradesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [trades, setTrades] = useState<AdminTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TradeStatus>("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const loadTrades = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (statusFilter !== "ALL" && statusFilter !== "OPEN") params.status = statusFilter;
      const res = await api.get<any>("/admin/trades", { params });
      const all: AdminTrade[] = res.data.data?.data ?? [];
      setTrades(all);
    } catch {
      setError("Failed to load trades");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) loadTrades();
  }, [user, statusFilter]);

  if (authLoading || !user) return null;
  if (!user.isAdmin) return null;

  const q = search.trim().toLowerCase();
  const filteredTrades = trades
    .filter((t) => statusFilter !== "OPEN" || OPEN_STATUSES.includes(t.status))
    .filter((t) =>
      !q ||
      t.tradeCode.toLowerCase().includes(q) ||
      t.proposer.username.toLowerCase().includes(q) ||
      t.receiver.username.toLowerCase().includes(q)
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Trade Management</h1>
          <p className="text-slate-400">Trades in active shipping/verification stages</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 rounded-xl p-4 mb-6">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-base text-red-300">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by trade number or username..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {([
            { key: "ALL", label: "All" },
            { key: "OPEN", label: "Open" },
            { key: "COMPLETED", label: "Completed" },
            { key: "CANCELLED", label: "Cancelled" },
            { key: "DISPUTED", label: "Disputed" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                statusFilter === key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-white">{q ? "No matches found" : "All clear"}</p>
            <p className="text-slate-400 mt-1">{q ? `No trades match "${search}".` : "No trades need attention right now."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrades.map((trade) => {
              const proposerShipment = trade.shipments.find((s) => s.senderId === trade.proposer.id);
              const receiverShipment = trade.shipments.find((s) => s.senderId === trade.receiver.id);

              return (
                <div key={trade.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold">Trade #{trade.tradeCode}</h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[trade.status] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
                          {STATUS_LABELS[trade.status] ?? trade.status}
                        </span>
                      </div>
                      <p className="text-base text-slate-400 mt-0.5">
                        {trade.proposer.username} ↔ {trade.receiver.username} · Updated {new Date(trade.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/admin/trades/${trade.id}`)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-base text-slate-300 hover:text-white transition-colors"
                    >
                      View Trade
                    </button>
                  </div>

                  {/* Shipment summary (read-only) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: `${trade.proposer.username}'s shipment`, shipment: proposerShipment },
                      { label: `${trade.receiver.username}'s shipment`, shipment: receiverShipment },
                    ].map(({ label, shipment }) => {
                      const delivered = shipment?.status === "DELIVERED";
                      return (
                        <div key={label} className={`rounded-lg p-4 border ${delivered ? "bg-green-950/20 border-green-500/20" : shipment ? "bg-slate-800/50 border-slate-700" : "bg-slate-800/30 border-slate-700/50"}`}>
                          <p className="text-base font-semibold text-slate-300 mb-1">{label}</p>
                          {!shipment ? (
                            <div className="flex items-center gap-2 text-slate-500"><Clock size={14} /><span className="text-base">Not yet shipped</span></div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {delivered ? <CheckCircle size={14} className="text-green-400" /> : <Truck size={14} className="text-blue-400" />}
                                <span className="text-base text-slate-300">{shipment.status}</span>
                              </div>
                              {shipment.trackingNumber
                                ? <p className="text-base text-slate-400">{shipment.carrier} · {shipment.trackingNumber}</p>
                                : <p className="text-base text-amber-400">No tracking</p>
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
