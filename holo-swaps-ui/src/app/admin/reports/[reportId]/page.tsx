"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supportApi, AdminReport } from "@/lib/api/support";
import { useAuthStore } from "@/lib/hooks/useAuth";
import {
  Loader2, Flag, CheckCircle, User, ArrowLeft, Send, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  FRAUD: "Fraud / Scam",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  FAKE_ACCOUNT: "Fake Account",
  OTHER: "Other",
};

export default function AdminReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const reportId = params.reportId as string;

  const [report, setReport] = useState<AdminReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [error, setError] = useState("");

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
        const data = await supportApi.getAdminReport(reportId);
        setReport(data);
      } catch {
        router.push("/admin/reports");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, reportId]);

  const handleSendReply = async () => {
    if (!replyBody.trim()) return;
    setIsSending(true);
    setError("");
    try {
      const msg = await supportApi.sendReportMessage(reportId, replyBody.trim());
      setReport((prev) => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
      setReplyBody("");
    } catch {
      setError("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async () => {
    setIsResolving(true);
    setError("");
    try {
      const updated = await supportApi.resolveReport(reportId, resolveNote.trim() || undefined);
      setReport(updated);
      setShowResolveForm(false);
    } catch {
      setError("Failed to resolve report.");
    } finally {
      setIsResolving(false);
    }
  };

  if (authLoading || !user?.isAdmin || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Back */}
        <button
          onClick={() => router.push("/admin/reports")}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Flag className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">User Report</h1>
              <p className="text-sm text-slate-400">
                {new Date(report.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          {report.isResolved ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">
              <CheckCircle className="h-4 w-4" /> Resolved
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium">
              Pending
            </span>
          )}
        </div>

        <div className="space-y-5">

          {/* Report Details */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Report Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Reported */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Reported User</p>
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {report.reported.avatarUrl ? (
                      <img src={report.reported.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <User className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <span className="font-medium text-white">@{report.reported.username}</span>
                </div>
              </div>

              {/* Reporter */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Reported By</p>
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {report.reporter.avatarUrl ? (
                      <img src={report.reporter.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                    ) : (
                      <User className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <span className="text-slate-300">@{report.reporter.username}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-20 flex-shrink-0">Reason</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">
                  {REASON_LABELS[report.reason] ?? report.reason}
                </span>
              </div>

              {report.tradeId && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-20 flex-shrink-0">Trade Ref</span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">{report.tradeId}</span>
                </div>
              )}

              {report.details && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Details</p>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {report.details}
                  </div>
                </div>
              )}

              {report.isResolved && report.resolvedNote && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Resolution Note</p>
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {report.resolvedNote}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300">Communication</h2>
              <p className="text-xs text-slate-400 mt-0.5">Messages sent here are emailed to the reporter</p>
            </div>

            <div className="p-6 space-y-3 min-h-[80px]">
              {report.messages.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No messages yet — use the box below to contact the reporter.</p>
              ) : (
                report.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-lg p-4",
                      msg.isAdminReply
                        ? "bg-indigo-500/10 border border-indigo-500/20 ml-8"
                        : "bg-slate-800/50 border border-slate-700 mr-8"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-400">
                        {msg.isAdminReply ? "Admin" : `@${report.reporter.username}`}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(msg.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply box — always visible while not resolved */}
            {!report.isResolved && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-4 space-y-3">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Write a message to the reporter..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendReply}
                    disabled={!replyBody.trim() || isSending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Message
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resolve section */}
          {!report.isResolved && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-300">Resolve Report</h2>
                  <p className="text-xs text-slate-400 mt-0.5">The reporter will be emailed when you resolve this.</p>
                </div>
                {!showResolveForm && (
                  <button
                    onClick={() => setShowResolveForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Resolve
                  </button>
                )}
              </div>

              {showResolveForm && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Resolution note (optional — included in email to reporter)</label>
                    <textarea
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Describe the action taken..."
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowResolveForm(false)}
                      className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResolve}
                      disabled={isResolving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Confirm Resolve
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        </div>
      </main>
    </div>
  );
}
