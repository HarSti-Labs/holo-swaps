"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supportApi, AdminTicketRow } from "@/lib/api/support";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { Loader2, Headphones, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  RESOLVED: "bg-green-500/10 text-green-400 border-green-500/30",
};

const URGENCY_DOT = {
  NORMAL: "bg-slate-400",
  HIGH: "bg-orange-400",
  URGENT: "bg-red-400",
};

const CATEGORIES = [
  "TRADE_DISPUTE", "CARD_CONDITION", "SHIPPING_TRACKING",
  "ACCOUNT_ISSUE", "BILLING_PAYMENT", "BUG_REPORT",
  "ABUSE_FRAUD", "GENERAL_QUESTION", "OTHER",
];

export default function AdminSupportPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  const [tickets, setTickets] = useState<AdminTicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/login"); return; }
    if (!user.isAdmin) { router.push("/dashboard"); return; }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await supportApi.getAdminTickets({
          status: filterStatus || undefined,
          urgency: filterUrgency || undefined,
          category: filterCategory || undefined,
          page,
        });
        setTickets(data.tickets);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, filterStatus, filterUrgency, filterCategory, page]);

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Headphones className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Support Board</h1>
              <p className="text-sm text-slate-400">{total} total tickets</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={filterUrgency}
            onChange={(e) => { setFilterUrgency(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All urgencies</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>

          {(filterStatus || filterUrgency || filterCategory) && (
            <button
              onClick={() => { setFilterStatus(""); setFilterUrgency(""); setFilterCategory(""); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-700 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Ticket table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <Headphones className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No tickets found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Ticket</span>
                <span>Category</span>
                <span>Urgency</span>
                <span>Status</span>
                <span>Date</span>
              </div>

              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/support/tickets/${ticket.ticketNumber}`}
                  className="block px-6 py-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Urgency dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      <div className={cn("w-2 h-2 rounded-full", URGENCY_DOT[ticket.urgency as keyof typeof URGENCY_DOT] ?? "bg-slate-400")} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</span>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", STATUS_STYLES[ticket.status])}>
                          {ticket.status.replace("_", " ")}
                        </span>
                        {ticket.messages.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MessageSquare className="h-3 w-3" />
                            {ticket.messages.length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{ticket.user ? `@${ticket.user.username}` : ticket.email}</span>
                        <span>·</span>
                        <span>{ticket.category.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
