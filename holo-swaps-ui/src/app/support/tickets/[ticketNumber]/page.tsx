"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supportApi, TicketDetail, TicketMessage } from "@/lib/api/support";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { Loader2, Send, ChevronLeft, Shield } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  RESOLVED: "bg-green-500/10 text-green-400 border-green-500/30",
};

const STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

const URGENCY_STYLES = {
  NORMAL: "text-slate-400",
  HIGH: "text-orange-400",
  URGENT: "text-red-400",
};

export default function TicketDetailPage() {
  const { ticketNumber } = useParams() as { ticketNumber: string };
  const router = useRouter();
  const { user } = useAuthStore();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await supportApi.getTicket(ticketNumber);
        setTicket(data);
        messageCountRef.current = data.messages.length;
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.push("/auth/login");
        } else {
          setError(err.response?.data?.message || "Ticket not found");
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [ticketNumber]);

  useEffect(() => {
    if (!ticket) return;
    // Only scroll when a new message is added, not on initial load
    if (ticket.messages.length > messageCountRef.current) {
      messageCountRef.current = ticket.messages.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.messages]);

  const handleSend = async () => {
    if (!reply.trim() || !ticket) return;
    setIsSending(true);
    try {
      const msg = await supportApi.postMessage(ticket.ticketNumber, reply.trim());
      setTicket({ ...ticket, messages: [...ticket.messages, msg] });
      setReply("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!ticket) return;
    setIsUpdatingStatus(true);
    try {
      await supportApi.updateStatus(ticket.ticketNumber, status);
      setTicket({ ...ticket, status: status as TicketDetail["status"] });
    } catch {
      alert("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Ticket not found"}</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">Go home</Link>
        </div>
      </div>
    );
  }

  const canReply = ticket.status !== "RESOLVED" || user?.isAdmin;
  const backHref = user?.isAdmin ? "/admin/support" : `/profile/${user?.username}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-3xl">

        {/* Back link */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {user?.isAdmin ? "Back to support board" : "Back to profile"}
        </Link>

        {/* Ticket header */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", STATUS_STYLES[ticket.status])}>
                  {STATUS_LABELS[ticket.status]}
                </span>
                <span className={cn("text-xs font-medium", URGENCY_STYLES[ticket.urgency])}>
                  {ticket.urgency}
                </span>
                <span className="text-xs text-slate-500">{ticket.category.replace(/_/g, " ")}</span>
              </div>
              <h1 className="text-xl font-bold text-white mb-1">{ticket.subject}</h1>
              {ticket.user && (
                <p className="text-sm text-slate-400">
                  Submitted by <span className="text-white">@{ticket.user.username}</span>
                  {" · "}{new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
              {ticket.tradeCode && (
                <p className="text-xs text-slate-500 font-mono mt-1">{ticket.tradeCode}</p>
              )}
            </div>

            {/* Admin status changer */}
            {user?.isAdmin && (
              <div className="flex items-center gap-2">
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus}
                  className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Original description */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Original Message</p>
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
        </div>

        {/* Message thread */}
        {ticket.messages.length > 0 && (
          <div className="space-y-3 mb-4">
            {ticket.messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Reply box */}
        {canReply ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            {user?.isAdmin && (
              <div className="flex items-center gap-1.5 text-xs text-blue-400 mb-3">
                <Shield className="h-3.5 w-3.5" />
                Replying as HoloSwaps Support — user will be notified by email
              </div>
            )}
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
              }}
              placeholder={user?.isAdmin ? "Write your reply to the user…" : "Write a reply…"}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500 resize-none mb-3"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={isSending || !reply.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-sm border border-slate-800 rounded-xl bg-slate-900/30">
            This ticket has been resolved. If you need further help,{" "}
            <Link href="/support" className="text-blue-400 hover:text-blue-300">open a new ticket</Link>.
          </div>
        )}
      </main>
    </div>
  );
}

function MessageBubble({ msg }: { msg: TicketMessage }) {
  return (
    <div className={cn("flex gap-3", msg.isAdminReply ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
        msg.isAdminReply
          ? "bg-blue-600 text-white"
          : "bg-slate-700 text-slate-200"
      )}>
        {msg.isAdminReply ? <Shield className="h-4 w-4" /> : (msg.author?.username?.[0]?.toUpperCase() ?? "?")}
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        msg.isAdminReply
          ? "bg-blue-600/20 border border-blue-500/30 rounded-tr-sm"
          : "bg-slate-800 border border-slate-700 rounded-tl-sm"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-xs font-semibold", msg.isAdminReply ? "text-blue-300" : "text-slate-300")}>
            {msg.isAdminReply ? "HoloSwaps Support" : `@${msg.author?.username ?? "User"}`}
          </span>
          <span className="text-xs text-slate-500">
            {new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" "}
            {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
      </div>
    </div>
  );
}
