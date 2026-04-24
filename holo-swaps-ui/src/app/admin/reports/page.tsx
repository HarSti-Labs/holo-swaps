"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supportApi, AdminReport } from "@/lib/api/support";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { Loader2, Flag, CheckCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  FRAUD: "Fraud / Scam",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  FAKE_ACCOUNT: "Fake Account",
  OTHER: "Other",
};

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

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
        const data = await supportApi.getAdminReports({ page });
        setReports(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, page]);

  const visibleReports = showResolved
    ? reports
    : reports.filter((r) => !r.isResolved);

  const pendingCount = reports.filter((r) => !r.isResolved).length;

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Flag className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">User Reports</h1>
              <p className="text-sm text-slate-400">
                {pendingCount} pending · {total} total
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowResolved((v) => !v)}
            className="px-3 py-2 rounded-lg border border-slate-700 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
        </div>

        {/* Report list */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : visibleReports.length === 0 ? (
            <div className="text-center py-16">
              <Flag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">
                {showResolved ? "No reports yet" : "No pending reports"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Reported User</span>
                <span>Reporter</span>
                <span>Reason</span>
                <span>Status</span>
              </div>

              {visibleReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/admin/reports/${report.id}`}
                  className={cn(
                    "block px-6 py-4 transition-colors hover:bg-slate-800/50",
                    report.isResolved && "opacity-60"
                  )}
                >
                  <div className="flex flex-col md:grid md:grid-cols-[1fr_1fr_auto_auto] gap-3 md:gap-4 md:items-center">

                    {/* Reported user */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        {report.reported.avatarUrl ? (
                          <img src={report.reported.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <User className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">@{report.reported.username}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>

                    {/* Reporter */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        {report.reporter.avatarUrl ? (
                          <img src={report.reporter.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <User className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slate-300">@{report.reporter.username}</p>
                        <p className="text-xs text-slate-400">Reporter</p>
                      </div>
                    </div>

                    {/* Reason */}
                    <div>
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex md:justify-end">
                      {report.isResolved ? (
                        <span className="flex items-center gap-1.5 text-xs text-green-400">
                          <CheckCircle className="h-3.5 w-3.5" /> Resolved
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 font-medium">Pending</span>
                      )}
                    </div>
                  </div>

                  {report.details && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-1 pl-11">{report.details}</p>
                  )}
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
