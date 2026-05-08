"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { api } from "@/lib/api/client";
import { Loader2, AlertTriangle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Dispute {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  trade: {
    id: string;
    tradeCode: string;
    proposer: { username: string };
    receiver: { username: string };
  };
  openedBy: { username: string };
  evidence: any[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-500/20 text-red-400 border-red-500/30",
  UNDER_REVIEW: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  RESOLVED_FOR_PROPOSER: "bg-green-500/20 text-green-400 border-green-500/30",
  RESOLVED_FOR_RECEIVER: "bg-green-500/20 text-green-400 border-green-500/30",
  RESOLVED_MUTUAL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED_FOR_PROPOSER: "Resolved (Proposer)",
  RESOLVED_FOR_RECEIVER: "Resolved (Receiver)",
  RESOLVED_MUTUAL: "Resolved (Mutual)",
};

const REASON_LABELS: Record<string, string> = {
  WRONG_CARDS: "Wrong cards received",
  CONDITION_MISMATCH: "Condition worse than described",
  MISSING_CARDS: "Missing cards",
  DAMAGED_IN_TRANSIT: "Damaged in transit",
  OTHER: "Other",
};

export default function AdminDisputesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("OPEN");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push("/");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.isAdmin) loadDisputes();
  }, [user, page]);

  const loadDisputes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/admin/disputes", { params: { page, limit: 20 } });
      setDisputes(res.data.data.data);
      setTotalPages(res.data.data.totalPages);
    } catch (err) {
      console.error("Failed to load disputes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user?.isAdmin) return null;

  const filtered = filter === "ALL" ? disputes : disputes.filter((d) => d.status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-slate-400 mt-1">Review and resolve trade disputes</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "OPEN", label: "Open" },
            { key: "UNDER_REVIEW", label: "Under Review" },
            { key: "RESOLVED_FOR_PROPOSER", label: "Resolved (Proposer)" },
            { key: "RESOLVED_FOR_RECEIVER", label: "Resolved (Receiver)" },
            { key: "RESOLVED_MUTUAL", label: "Resolved (Mutual)" },
            { key: "ALL", label: "All" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {label}
              {key === "OPEN" && disputes.filter((d) => d.status === "OPEN").length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {disputes.filter((d) => d.status === "OPEN").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <CheckCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No disputes in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((dispute) => (
              <div
                key={dispute.id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[dispute.status] ?? "bg-slate-700 text-slate-400 border-slate-600"}`}>
                        {STATUS_LABELS[dispute.status] ?? dispute.status}
                      </span>
                      <span className="text-base font-mono text-slate-400">#{dispute.trade.tradeCode}</span>
                      <span className="text-base text-slate-500">
                        {new Date(dispute.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-white font-semibold mb-0.5">
                      {REASON_LABELS[dispute.reason] ?? dispute.reason}
                    </p>
                    <p className="text-base text-slate-400">
                      Opened by <span className="text-slate-300">{dispute.openedBy.username}</span>
                      {" "}· Trade between{" "}
                      <span className="text-slate-300">{dispute.trade.proposer.username}</span>
                      {" & "}
                      <span className="text-slate-300">{dispute.trade.receiver.username}</span>
                    </p>
                    {dispute.details && (
                      <p className="text-base text-slate-400 mt-1 line-clamp-2">{dispute.details}</p>
                    )}
                    {dispute.evidence.length > 0 && (
                      <p className="text-base text-blue-400 mt-1">{dispute.evidence.length} evidence item{dispute.evidence.length !== 1 ? "s" : ""} submitted</p>
                    )}
                  </div>
                  <Link
                    href={`/admin/trades/${dispute.trade.id}`}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Trade
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              Previous
            </button>
            <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
