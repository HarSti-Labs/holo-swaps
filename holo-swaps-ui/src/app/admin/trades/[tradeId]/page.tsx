"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { api } from "@/lib/api/client";
import {
  Loader2, Package, CheckCircle, Clock, Truck, Send,
  MessageSquare, AlertTriangle, X, ArrowLeft, Star, ShieldCheck,
} from "lucide-react";
import { CONDITION_LABELS } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  PROPOSED: "Proposed", COUNTERED: "Counter Offer", ACCEPTED: "Accepted",
  BOTH_SHIPPED: "Both Shipped", A_RECEIVED: "Partially Received",
  B_RECEIVED: "Partially Received", BOTH_RECEIVED: "Both Received",
  VERIFIED: "Verified", COMPLETED: "Completed", DISPUTED: "Disputed", CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PROPOSED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COUNTERED: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ACCEPTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  BOTH_SHIPPED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  A_RECEIVED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  B_RECEIVED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  BOTH_RECEIVED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VERIFIED: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  DISPUTED: "bg-red-500/20 text-red-400 border-red-500/30",
  CANCELLED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function AdminTradeDetailPage() {
  const { tradeId } = useParams<{ tradeId: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  const [trade, setTrade] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Chat
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Outbound tracking
  const [outboundTracking, setOutboundTracking] = useState<Record<string, { carrier: string; trackingNumber: string }>>({});
  const [submittingOutbound, setSubmittingOutbound] = useState<string | null>(null);
  const [editingOutbound, setEditingOutbound] = useState<string | null>(null); // recipientId being edited

  // Verification
  const [verifyingCardId, setVerifyingCardId] = useState<string | null>(null);
  const [verifyNotes, setVerifyNotes] = useState<Record<string, string>>({});

  // Mark as received
  const [confirmingReceived, setConfirmingReceived] = useState<string | null>(null); // senderId

  // Actions
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [forceStatusPending, setForceStatusPending] = useState<"BOTH_RECEIVED" | "VERIFIED" | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) router.replace("/");
  }, [user, authLoading, router]);

  const loadTrade = async () => {
    try {
      const res = await api.get<any>(`/trades/${tradeId}`);
      setTrade(res.data.data);
    } catch {
      setError("Failed to load trade");
    }
  };

  const loadMessages = async () => {
    try {
      const res = await api.get<any>(`/trades/${tradeId}/messages`);
      setMessages(res.data.data ?? []);
    } catch {}
  };

  useEffect(() => {
    if (!user?.isAdmin) return;
    Promise.all([loadTrade(), loadMessages()]).finally(() => setIsLoading(false));
  }, [user, tradeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      await api.post(`/trades/${tradeId}/messages`, { body: newMessage.trim() });
      setNewMessage("");
      await loadMessages();
    } catch {} finally {
      setIsSending(false);
    }
  };

  const handleOutboundTracking = async (recipientId: string) => {
    const { carrier, trackingNumber } = outboundTracking[recipientId] ?? {};
    if (!trackingNumber?.trim()) return;
    setSubmittingOutbound(recipientId);
    setActionError(null);
    try {
      await api.post(`/trades/${tradeId}/admin-outbound-tracking`, { recipientId, trackingNumber: trackingNumber.trim(), carrier: carrier || "Other" });
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to submit tracking");
    } finally {
      setSubmittingOutbound(null);
    }
  };

  const handleVerify = async (collectionItemId: string, cardOwnerId: string, pass: boolean) => {
    setVerifyingCardId(collectionItemId);
    setActionError(null);
    try {
      await api.patch(`/trades/${tradeId}/verify`, {
        collectionItemId,
        cardOwnerId,
        mediaUrls: [],
        conditionConfirmed: pass,
        conditionNotes: verifyNotes[collectionItemId] || undefined,
        isAuthentic: pass,
      });
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifyingCardId(null);
    }
  };

  const handleMarkAsReceived = async (senderId: string) => {
    setConfirmingReceived(senderId);
    setActionError(null);
    try {
      await api.patch(`/trades/${tradeId}/admin-received`, { senderId });
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to mark as received");
    } finally {
      setConfirmingReceived(null);
    }
  };

  const handleForceStatus = async () => {
    if (!forceStatusPending) return;
    setIsForcing(true);
    setActionError(null);
    try {
      await api.patch(`/trades/${tradeId}/admin-force-status`, { status: forceStatusPending });
      setForceStatusPending(null);
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to force status");
    } finally {
      setIsForcing(false);
    }
  };

  const handleUpdateOutboundTracking = async (recipientId: string) => {
    setSubmittingOutbound(recipientId);
    setActionError(null);
    try {
      await api.patch(`/trades/${tradeId}/admin-outbound-tracking`, {
        recipientId,
        trackingNumber: outboundTracking[recipientId]?.trackingNumber?.trim(),
        carrier: outboundTracking[recipientId]?.carrier ?? "USPS",
      });
      setEditingOutbound(null);
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to update tracking");
    } finally {
      setSubmittingOutbound(null);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    setActionError(null);
    try {
      await api.patch(`/trades/${tradeId}/complete`);
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to complete trade");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeNotes.trim()) return;
    setIsDisputing(true);
    setActionError(null);
    try {
      await api.patch(`/trades/${tradeId}/admin-dispute`, { notes: disputeNotes.trim() });
      setShowDisputeForm(false);
      await loadTrade();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to open dispute");
    } finally {
      setIsDisputing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }
  if (error || !trade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <p className="text-red-400">{error || "Trade not found"}</p>
      </div>
    );
  }

  const proposerItems = trade.items?.filter((i: any) => i.ownedByProposer) ?? [];
  const receiverItems = trade.items?.filter((i: any) => !i.ownedByProposer) ?? [];
  const inboundShipments = trade.shipments?.filter((s: any) => s.direction === "INBOUND") ?? [];
  const outboundShipments = trade.shipments?.filter((s: any) => s.direction === "OUTBOUND") ?? [];
  const verifications = trade.verifications ?? [];

  const proposerInbound = inboundShipments.find((s: any) => s.senderId === trade.proposer.id);
  const receiverInbound = inboundShipments.find((s: any) => s.senderId === trade.receiver.id);
  const outboundToProposer = outboundShipments.find((s: any) => s.receiverId === trade.proposer.id);
  const outboundToReceiver = outboundShipments.find((s: any) => s.receiverId === trade.receiver.id);

  const getVerification = (collectionItemId: string) =>
    verifications.find((v: any) => v.collectionItemId === collectionItemId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.push("/admin/trades")} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Trade Management
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Trade #{trade.tradeCode}</h1>
              <p className="text-slate-400 mt-1">{trade.proposer.username} ↔ {trade.receiver.username} · {new Date(trade.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${STATUS_COLORS[trade.status] ?? "bg-slate-700 text-white border-slate-600"}`}>
              {STATUS_LABELS[trade.status] ?? trade.status}
            </span>
          </div>
        </div>

        {actionError && (
          <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 rounded-xl p-4 mb-6">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-base text-red-300 flex-1">{actionError}</p>
            <button onClick={() => setActionError(null)}><X size={14} className="text-slate-400" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Both parties' cards */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Trade Items</h2>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: `${trade.proposer.username}'s cards (going to ${trade.receiver.username})`, items: proposerItems },
                  { label: `${trade.receiver.username}'s cards (going to ${trade.proposer.username})`, items: receiverItems },
                ].map(({ label, items }) => (
                  <div key={label}>
                    <p className="text-base font-semibold text-slate-400 mb-3">{label}</p>
                    <div className="space-y-3">
                      {items.length === 0 && <p className="text-base text-slate-500">No cards</p>}
                      {items.map((item: any) => {
                        const card = item.collectionItem ?? item.proposerCollection ?? item.receiverCollection;
                        if (!card) return null;
                        const verification = getVerification(card.id);
                        return (
                          <div key={item.id} className={`rounded-lg p-3 border ${verification ? (verification.conditionConfirmed ? "bg-green-950/20 border-green-500/20" : "bg-red-950/20 border-red-500/20") : "bg-slate-800/50 border-slate-700"}`}>
                            <div className="flex gap-3">
                              {card.card.imageUrl
                                ? <img src={card.card.imageUrl} alt={card.card.name} className="w-12 h-16 object-cover rounded flex-shrink-0" />
                                : <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center flex-shrink-0"><Package size={16} className="text-slate-400" /></div>
                              }
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base truncate">{card.card.name}</p>
                                <p className="text-base text-slate-400">{CONDITION_LABELS[card.condition as keyof typeof CONDITION_LABELS] ?? card.condition}{card.isFoil ? " · Foil" : ""}</p>
                                <p className="text-base text-green-400">${(card.askingValueOverride ?? card.currentMarketValue ?? 0).toFixed(2)}</p>
                              </div>
                            </div>

                            {verification && (
                              <div className={`mt-2 flex items-center gap-2 text-base ${verification.conditionConfirmed ? "text-green-400" : "text-red-400"}`}>
                                {verification.conditionConfirmed ? <CheckCircle size={13} /> : <X size={13} />}
                                {verification.conditionConfirmed ? "Verified — passed" : "Failed verification"}
                                {verification.conditionNotes && <span className="text-slate-400">· {verification.conditionNotes}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {trade.cashDifference > 0 && (
                <p className="mt-4 text-base text-amber-400">
                  + ${trade.cashDifference.toFixed(2)} cash from {trade.cashPayerId === trade.proposer.id ? trade.proposer.username : trade.receiver.username}
                </p>
              )}
            </div>

            {/* Inbound shipments (users → verification center) */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Inbound Shipments (Users → You)</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: `From ${trade.proposer.username}`, shipment: proposerInbound, senderId: trade.proposer.id, hasCards: proposerItems.length > 0 },
                  { label: `From ${trade.receiver.username}`, shipment: receiverInbound, senderId: trade.receiver.id, hasCards: receiverItems.length > 0 },
                ].map(({ label, shipment, senderId, hasCards }) => {
                  const canMark = shipment && shipment.status !== "DELIVERED" && ["ACCEPTED", "BOTH_SHIPPED", "A_RECEIVED", "B_RECEIVED"].includes(trade.status);
                  const isMarking = confirmingReceived === senderId;
                  const cashOnly = !hasCards;
                  return (
                    <div key={label} className={`rounded-lg p-4 border ${cashOnly ? "bg-slate-800/20 border-slate-700/40" : shipment?.status === "DELIVERED" ? "bg-green-950/20 border-green-500/20" : shipment ? "bg-slate-800/50 border-slate-700" : "bg-slate-800/30 border-slate-700/50"}`}>
                      <p className="text-base font-semibold text-slate-300 mb-2">{label}</p>
                      {cashOnly ? (
                        <div className="flex items-center gap-2 text-slate-500"><CheckCircle size={14} className="text-teal-500" /><span className="text-base text-teal-400">Cash only — no shipment required</span></div>
                      ) : !shipment ? (
                        <div className="flex items-center gap-2 text-slate-500"><Clock size={14} /><span className="text-base">Not yet shipped</span></div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {shipment.status === "DELIVERED" ? <CheckCircle size={14} className="text-green-400" /> : <Truck size={14} className="text-blue-400" />}
                            <span className="text-base text-slate-300">{shipment.status}</span>
                          </div>
                          {shipment.trackingNumber
                            ? <p className="text-base text-slate-400">{shipment.carrier} · {shipment.trackingNumber}</p>
                            : <p className="text-base text-amber-400">No tracking provided</p>
                          }
                          {canMark && (
                            <button
                              onClick={() => handleMarkAsReceived(senderId)}
                              disabled={isMarking}
                              className="mt-1 flex items-center gap-2 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-base font-medium transition-colors"
                            >
                              {isMarking ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              Mark as Received
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card Verification — only when both packages are in hand */}
            {trade.status === "BOTH_RECEIVED" && (
              <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-1">
                  <ShieldCheck size={20} className="text-cyan-400" />
                  <h2 className="text-xl font-bold">Card Verification</h2>
                </div>
                <p className="text-base text-slate-400 mb-5">Both packages received. Inspect each card and mark Pass or Fail. Once all cards are verified the trade will advance automatically.</p>
                <div className="space-y-4">
                  {[...proposerItems, ...receiverItems].map((item: any) => {
                    const card = item.collectionItem ?? item.proposerCollection ?? item.receiverCollection;
                    if (!card) return null;
                    const verification = getVerification(card.id);
                    const isOwnerProposer = proposerItems.includes(item);
                    const ownerName = isOwnerProposer ? trade.proposer.username : trade.receiver.username;
                    return (
                      <div key={item.id} className={`rounded-lg p-4 border ${verification ? (verification.conditionConfirmed ? "bg-green-950/20 border-green-500/30" : "bg-red-950/20 border-red-500/30") : "bg-slate-800/50 border-slate-700"}`}>
                        <div className="flex gap-3 items-start">
                          {card.card.imageUrl
                            ? <img src={card.card.imageUrl} alt={card.card.name} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                            : <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center flex-shrink-0"><Package size={14} className="text-slate-400" /></div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base truncate">{card.card.name}</p>
                            <p className="text-base text-slate-400">{ownerName}'s card · {CONDITION_LABELS[card.condition as keyof typeof CONDITION_LABELS] ?? card.condition}{card.isFoil ? " · Foil" : ""}</p>
                          </div>
                          {verification ? (
                            <div className={`flex items-center gap-1.5 text-base font-medium flex-shrink-0 ${verification.conditionConfirmed ? "text-green-400" : "text-red-400"}`}>
                              {verification.conditionConfirmed ? <CheckCircle size={15} /> : <X size={15} />}
                              {verification.conditionConfirmed ? "Passed" : "Failed"}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 flex-shrink-0 w-48">
                              <textarea
                                value={verifyNotes[card.id] ?? ""}
                                onChange={(e) => setVerifyNotes((p) => ({ ...p, [card.id]: e.target.value }))}
                                placeholder="Notes (optional)"
                                rows={2}
                                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleVerify(card.id, card.userId, true)}
                                  disabled={verifyingCardId === card.id}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-base font-medium transition-colors"
                                >
                                  {verifyingCardId === card.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                  Pass
                                </button>
                                <button
                                  onClick={() => handleVerify(card.id, card.userId, false)}
                                  disabled={verifyingCardId === card.id}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-base font-medium transition-colors"
                                >
                                  {verifyingCardId === card.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                  Fail
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {verification?.conditionNotes && (
                          <p className="mt-2 text-base text-slate-400 pl-[52px]">Note: {verification.conditionNotes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Outbound shipments (verification center → users) — only after all cards verified */}
            {["VERIFIED", "COMPLETED"].includes(trade.status) && (
              <div className={`bg-slate-900/50 rounded-xl p-6 border ${trade.status === "VERIFIED" && !outboundToProposer && !outboundToReceiver ? "border-amber-500/40" : "border-slate-800"}`}>
                <div className="flex items-center gap-3 mb-1">
                  <Truck size={20} className="text-blue-400" />
                  <h2 className="text-xl font-bold">Ship Cards to Recipients</h2>
                </div>
                {trade.status === "VERIFIED" && !outboundToProposer && !outboundToReceiver
                  ? <p className="text-base text-amber-400 mb-4">All cards verified — add a tracking number for each recipient so they can follow their shipment.</p>
                  : <p className="text-base text-slate-400 mb-4">Recipients can track their shipment from their trade page.</p>
                }
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: `To ${trade.proposer.username}`, recipientId: trade.proposer.id, existing: outboundToProposer, receivesCards: receiverItems.length > 0 },
                    { label: `To ${trade.receiver.username}`, recipientId: trade.receiver.id, existing: outboundToReceiver, receivesCards: proposerItems.length > 0 },
                  ].filter((r) => r.receivesCards).map(({ label, recipientId, existing }) => (
                    <div key={recipientId} className={`rounded-lg p-4 border ${existing ? "bg-green-950/20 border-green-500/20" : "bg-slate-800/50 border-slate-700"}`}>
                      <p className="text-base font-semibold text-slate-300 mb-3">{label}</p>
                      {existing && editingOutbound !== recipientId ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2"><Truck size={14} className="text-green-400" /><span className="text-base text-slate-300">{existing.status}</span></div>
                          {existing.trackingNumber && <p className="text-base text-slate-400">{existing.carrier} · {existing.trackingNumber}</p>}
                          <button
                            onClick={() => {
                              setEditingOutbound(recipientId);
                              setOutboundTracking((p) => ({ ...p, [recipientId]: { carrier: existing.carrier ?? "USPS", trackingNumber: existing.trackingNumber ?? "" } }));
                            }}
                            className="flex items-center gap-1.5 text-base text-slate-400 hover:text-white transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit tracking
                          </button>
                        </div>
                      ) : existing && editingOutbound === recipientId ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <select
                              value={outboundTracking[recipientId]?.carrier ?? "USPS"}
                              onChange={(e) => setOutboundTracking((p) => ({ ...p, [recipientId]: { ...p[recipientId], carrier: e.target.value } }))}
                              className="w-full px-3 py-2 pr-8 bg-slate-800 border border-slate-700 rounded-lg text-base text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {["USPS", "UPS", "FedEx", "DHL", "Other"].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={outboundTracking[recipientId]?.trackingNumber ?? ""}
                            onChange={(e) => setOutboundTracking((p) => ({ ...p, [recipientId]: { ...p[recipientId], trackingNumber: e.target.value } }))}
                            placeholder="Tracking number"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateOutboundTracking(recipientId)}
                              disabled={submittingOutbound === recipientId || !outboundTracking[recipientId]?.trackingNumber?.trim()}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-base font-medium transition-colors"
                            >
                              {submittingOutbound === recipientId ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOutbound(null)}
                              className="px-3 py-2 text-slate-400 hover:text-white text-base transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <select
                              value={outboundTracking[recipientId]?.carrier ?? "USPS"}
                              onChange={(e) => setOutboundTracking((p) => ({ ...p, [recipientId]: { ...p[recipientId], carrier: e.target.value } }))}
                              className="w-full px-3 py-2 pr-8 bg-slate-800 border border-slate-700 rounded-lg text-base text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {["USPS", "UPS", "FedEx", "DHL", "Other"].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={outboundTracking[recipientId]?.trackingNumber ?? ""}
                            onChange={(e) => setOutboundTracking((p) => ({ ...p, [recipientId]: { ...p[recipientId], trackingNumber: e.target.value } }))}
                            placeholder="Tracking number"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleOutboundTracking(recipientId)}
                            disabled={submittingOutbound === recipientId || !outboundTracking[recipientId]?.trackingNumber?.trim()}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-base font-medium transition-colors"
                          >
                            {submittingOutbound === recipientId ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
                            Submit Tracking
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin actions */}
            {!["COMPLETED", "CANCELLED"].includes(trade.status) && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="text-xl font-bold">Admin Actions</h2>

                {trade.status === "VERIFIED" && (
                  <div className="flex items-center justify-between gap-4 p-4 bg-green-950/30 border border-green-500/20 rounded-lg">
                    <div>
                      <p className="text-base font-semibold text-green-300">Ready to complete</p>
                      <p className="text-base text-slate-400">Both cards verified. This will capture payments and transfer card ownership.</p>
                    </div>
                    <button
                      onClick={handleComplete}
                      disabled={isCompleting}
                      className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-base font-semibold transition-colors"
                    >
                      {isCompleting ? <Loader2 size={15} className="animate-spin" /> : <Star size={15} />}
                      Complete Trade
                    </button>
                  </div>
                )}

                {/* Override section — for cash-only or legacy bad-data trades */}
                {!["VERIFIED", "COMPLETED", "CANCELLED", "DISPUTED"].includes(trade.status) && (
                  <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-lg space-y-2">
                    <p className="text-base font-semibold text-amber-300">Manual Override</p>
                    <p className="text-base text-slate-400">Use these if the trade is stuck due to a cash-only party or legacy data. These bypass normal checks.</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {!["BOTH_RECEIVED", "VERIFIED"].includes(trade.status) && (
                        <button
                          onClick={() => setForceStatusPending("BOTH_RECEIVED")}
                          className="flex items-center gap-2 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-base font-medium transition-colors"
                        >
                          <CheckCircle size={13} />
                          Force → Both Received
                        </button>
                      )}
                      <button
                        onClick={() => setForceStatusPending("VERIFIED")}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-base font-medium transition-colors"
                      >
                        <ShieldCheck size={13} />
                        Force → Verified
                      </button>
                    </div>
                  </div>
                )}

                {!showDisputeForm ? (
                  <button
                    onClick={() => setShowDisputeForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-400 rounded-lg text-base font-medium transition-colors"
                  >
                    <AlertTriangle size={14} />
                    Open Dispute
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-red-950/20 border border-red-500/20 rounded-lg">
                    <p className="text-base font-semibold text-red-400">Open a dispute</p>
                    <textarea
                      value={disputeNotes}
                      onChange={(e) => setDisputeNotes(e.target.value)}
                      placeholder="Describe the issue..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setShowDisputeForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-base transition-colors">Cancel</button>
                      <button
                        onClick={handleDispute}
                        disabled={isDisputing || !disputeNotes.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-base font-medium transition-colors"
                      >
                        {isDisputing ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                        Confirm Dispute
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column — Admin chat */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col" style={{ minHeight: "480px" }}>
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold">Trade Chat</h3>
                </div>
                <p className="text-base text-amber-400 mt-1">Your messages are sent to both parties</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0
                  ? <p className="text-center text-slate-400 text-base py-8">No messages yet.</p>
                  : messages.map((msg: any) => {
                    const isAdmin = msg.sender?.isAdmin;
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 ${isMe ? "bg-blue-600 text-white" : isAdmin ? "bg-purple-900/60 border border-purple-500/30 text-slate-100" : "bg-slate-800 text-slate-100"}`}>
                          {!isMe && <p className="text-xs font-semibold mb-1 opacity-70">{isAdmin ? "HoloSwaps Admin" : msg.sender?.username}</p>}
                          <p className="text-base">{msg.body}</p>
                          <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-slate-400"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                }
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message both parties..."
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </form>
            </div>

            {/* Trade info summary */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-base font-semibold text-slate-300">Trade Summary</p>
              <div className="text-base text-slate-400 space-y-1">
                <p>Proposer: <span className="text-white">{trade.proposer.username}</span></p>
                <p>Receiver: <span className="text-white">{trade.receiver.username}</span></p>
                <p>Created: <span className="text-white">{new Date(trade.createdAt).toLocaleDateString()}</span></p>
                {trade.cashDifference > 0 && (
                  <p>Cash add: <span className="text-amber-400">${trade.cashDifference.toFixed(2)}</span></p>
                )}
                <p>Proposer paid: <span className={trade.stripeProposerIntentId ? "text-green-400" : "text-slate-500"}>{trade.stripeProposerIntentId ? "Yes" : "No"}</span></p>
                <p>Receiver paid: <span className={trade.stripeReceiverIntentId ? "text-green-400" : "text-slate-500"}>{trade.stripeReceiverIntentId ? "Yes" : "No"}</span></p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Force Status Confirmation Modal */}
      {forceStatusPending && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !isForcing && setForceStatusPending(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-400" />
                <h2 className="text-xl font-bold">Confirm Override</h2>
              </div>
              <button onClick={() => setForceStatusPending(null)} disabled={isForcing} className="text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-300">
                You are about to force this trade to{" "}
                <span className="font-semibold text-white">
                  {forceStatusPending === "BOTH_RECEIVED" ? "Both Received" : "Verified"}
                </span>.
              </p>
              <p className="text-base text-slate-400">
                This bypasses the normal flow and should only be used to fix trades stuck due to a cash-only party or legacy data issues.
              </p>
              {actionError && <p className="text-base text-red-400">{actionError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setForceStatusPending(null)}
                  disabled={isForcing}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-base font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceStatus}
                  disabled={isForcing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-base font-semibold transition-colors"
                >
                  {isForcing ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
