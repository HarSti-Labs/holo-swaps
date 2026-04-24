"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supportApi, AdminTicketRow } from "@/lib/api/support";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { Loader2, Headphones, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

type StatusTab = "OPEN" | "IN_PROGRESS" | "RESOLVED";

const TABS: { key: StatusTab; label: string; color: string; activeClass: string }[] = [
  {
    key: "OPEN",
    label: "Open",
    color: "text-blue-400",
    activeClass: "border-b-2 border-blue-400 text-blue-400",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    color: "text-orange-400",
    activeClass: "border-b-2 border-orange-400 text-orange-400",
  },
  {
    key: "RESOLVED",
    label: "Resolved",
    color: "text-green-400",
    activeClass: "border-b-2 border-green-400 text-green-400",
  },
];

export default function AdminSupportPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  const [activeTab, setActiveTab] = useState<StatusTab>("OPEN");
  const [tickets, setTickets] = useState<AdminTicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [tabCounts, setTabCounts] = useState<Record<StatusTab, number>>({ OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 });

  const [filterUrgency, setFilterUrgency] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/login"); return; }
    if (!user.isAdmin) { router.push("/dashboard"); return; }
  }, [user, authLoading]);

  // Fetch counts for all tabs on mount and after filter changes
  useEffect(() => {
    if (!user?.isAdmin) return;
    const fetchCounts = async () => {
      const [open, inProgress, resolved] = await Promise.all([
        supportApi.getAdminTickets({ status: "OPEN", urgency: filterUrgency || undefined, category: filterCategory || undefined, page: 1, limit: 1 }),
        supportApi.getAdminTickets({ status: "IN_PROGRESS", urgency: filterUrgency || undefined, category: filterCategory || undefined, page: 1, limit: 1 }),
        supportApi.getAdminTickets({ status: "RESOLVED", urgency: filterUrgency || undefined, category: filterCategory || undefined, page: 1, limit: 1 }),
      ]);
      setTabCounts({ OPEN: open.total, IN_PROGRESS: inProgress.total, RESOLVED: resolved.total });
    };
    fetchCounts().catch(() => {});
  }, [user, filterUrgency, filterCategory]);

  // Fetch tickets for the active tab
  useEffect(() => {
    if (!user?.isAdmin) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await supportApi.getAdminTickets({
          status: activeTab,
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
  }, [user, activeTab, filterUrgency, filterCategory, page]);

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setPage(1);
  };

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
              <p className="text-base text-slate-400">
                {tabCounts.OPEN + tabCounts.IN_PROGRESS + tabCounts.RESOLVED} total tickets
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterUrgency}
            onChange={(e) => { setFilterUrgency(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All urgencies</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>

          {(filterUrgency || filterCategory) && (
            <button
              onClick={() => { setFilterUrgency(""); setFilterCategory(""); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-700 text-base text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-800 mb-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-base font-medium transition-colors",
                activeTab === tab.key
                  ? tab.activeClass
                  : "text-slate-400 hover:text-slate-300"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-base font-bold px-2 py-0.5 rounded-full",
                activeTab === tab.key
                  ? tab.key === "OPEN" ? "bg-blue-500/20 text-blue-300"
                    : tab.key === "IN_PROGRESS" ? "bg-orange-500/20 text-orange-300"
                    : "bg-green-500/20 text-green-300"
                  : "bg-slate-700 text-slate-400"
              )}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Ticket table */}
        <div className="bg-slate-900/50 border border-slate-800 border-t-0 rounded-b-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <Headphones className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">No {activeTab.replace("_", " ").toLowerCase()} tickets</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 text-base font-semibold text-slate-400 uppercase tracking-wider">
                <span>Ticket</span>
                <span>Category</span>
                <span>Urgency</span>
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
                        <span className="font-mono text-base text-slate-400">{ticket.ticketNumber}</span>
                        {ticket.messages.length > 0 && (
                          <span className="flex items-center gap-1 text-base text-slate-400">
                            <MessageSquare className="h-3 w-3" />
                            {ticket.messages.length}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-medium text-white truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-base text-slate-400">
                        <span>{ticket.user ? `@${ticket.user.username}` : ticket.email}</span>
                        <span>·</span>
                        <span>{ticket.category.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>

                    {/* Urgency badge */}
                    <span className={cn(
                      "hidden md:inline-block text-base font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                      ticket.urgency === "URGENT" ? "bg-red-500/10 text-red-400" :
                      ticket.urgency === "HIGH" ? "bg-orange-500/10 text-orange-400" :
                      "bg-slate-700/50 text-slate-400"
                    )}>
                      {ticket.urgency}
                    </span>
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
              className="px-4 py-2 rounded-lg border border-slate-700 text-base text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-base text-slate-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-slate-700 text-base text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
