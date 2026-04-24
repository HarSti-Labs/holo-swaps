"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { usersApi, ReportPayload } from "@/lib/api/users";
import { supportApi, SupportTicketSummary } from "@/lib/api/support";
import { collectionApi } from "@/lib/api/collection";
import { User, CollectionItem, CONDITION_LABELS } from "@/types";
import { Loader2, Star, TrendingUp, MapPin, Calendar, UserPlus, UserMinus, Users, Headphones, ChevronRight, Package, ArrowLeftRight, MoreHorizontal, ShieldOff, Shield, Flag, X, ChevronDown } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useAuthStore } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { TradeProposalModal } from "@/components/trades/TradeProposalModal";

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuthStore();

  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"stats" | "tickets" | "collection">("stats");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [theirCollection, setTheirCollection] = useState<CollectionItem[]>([]);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);
  const [collectionLoaded, setCollectionLoaded] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const profileData = await usersApi.getProfile(username);
        setUser(profileData);
        setIsFollowing(profileData.isFollowing ?? false);
        setIsBlocked(profileData.isBlocked ?? false);

        if (currentUser?.username === username) {
          try {
            const myTickets = await supportApi.getMyTickets();
            setTickets(myTickets);
          } catch {
            // Not critical
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const loadCollection = async () => {
    if (collectionLoaded) return;
    setIsLoadingCollection(true);
    try {
      const result = await collectionApi.getUserCollection(username, 1, 100);
      setTheirCollection(result.data.filter((item) => item.status === "AVAILABLE"));
      setCollectionLoaded(true);
    } catch (err) {
      console.error("Failed to load collection:", err);
    } finally {
      setIsLoadingCollection(false);
    }
  };

  const handleTabChange = (tab: "stats" | "tickets" | "collection") => {
    setActiveTab(tab);
    if (tab === "collection" && !collectionLoaded) {
      loadCollection();
    }
  };

  // Close more-menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFollow = async () => {
    if (!currentUser || !user) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await usersApi.unfollow(user.id);
        setIsFollowing(false);
        setUser({ ...user, followerCount: (user.followerCount || 0) - 1 });
      } else {
        await usersApi.follow(user.id);
        setIsFollowing(true);
        setUser({ ...user, followerCount: (user.followerCount || 0) + 1 });
      }
    } catch (err: any) {
      console.error("Failed to follow/unfollow:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!currentUser || !user) return;
    setMoreMenuOpen(false);
    setIsBlockLoading(true);
    try {
      if (isBlocked) {
        await usersApi.unblock(user.id);
        setIsBlocked(false);
      } else {
        await usersApi.block(user.id);
        setIsBlocked(true);
        setIsFollowing(false);
      }
    } catch (err: any) {
      console.error("Failed to block/unblock:", err);
    } finally {
      setIsBlockLoading(false);
    }
  };

  const handleReport = async () => {
    if (!currentUser || !user || !reportReason) return;
    setIsReporting(true);
    try {
      await usersApi.report(user.id, { reason: reportReason, details: reportDetails || undefined });
      setReportSent(true);
    } catch (err: any) {
      console.error("Failed to report:", err);
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || "User not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-white">
                {getInitials(user.username)}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold">{user.username}</h1>
                {!isOwnProfile && currentUser && (
                  <div className="flex items-center gap-2">
                    {/* Follow / Unfollow */}
                    {!isBlocked && (
                      <button
                        onClick={handleFollow}
                        disabled={isFollowLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isFollowing
                            ? "bg-slate-700 hover:bg-slate-600 text-white"
                            : "bg-blue-600 hover:bg-blue-500 text-white"
                        }`}
                      >
                        {isFollowLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isFollowing ? (
                          <><UserMinus className="h-4 w-4" /> Unfollow</>
                        ) : (
                          <><UserPlus className="h-4 w-4" /> Follow</>
                        )}
                      </button>
                    )}

                    {/* ⋮ More actions */}
                    <div ref={moreMenuRef} className="relative">
                      <button
                        onClick={() => setMoreMenuOpen((v) => !v)}
                        className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {moreMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-20">
                          <button
                            onClick={handleBlock}
                            disabled={isBlockLoading}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-base text-left hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            {isBlocked ? (
                              <><Shield className="h-4 w-4 text-green-400" /><span className="text-green-400">Unblock user</span></>
                            ) : (
                              <><ShieldOff className="h-4 w-4 text-orange-400" /><span className="text-orange-400">Block user</span></>
                            )}
                          </button>
                          <button
                            onClick={() => { setMoreMenuOpen(false); setShowReportModal(true); }}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-base text-left hover:bg-slate-700 transition-colors"
                          >
                            <Flag className="h-4 w-4 text-red-400" />
                            <span className="text-red-400">Report user</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Blocked banner */}
                {isBlocked && (
                  <span className="text-base text-orange-400 bg-orange-400/10 border border-orange-400/30 px-2.5 py-1 rounded-lg">
                    You've blocked this user
                  </span>
                )}
              </div>

              {user.bio && <p className="text-slate-400 mb-4">{user.bio}</p>}

              <div className="flex flex-wrap gap-4 text-base text-slate-400">
                {user.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {user.location}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <Link href={`/profile/${username}/followers`} className="hover:text-blue-400 transition-colors">
                    <span className="font-medium text-white">{user.followerCount || 0}</span> followers
                  </Link>
                  <span>·</span>
                  <Link href={`/profile/${username}/following`} className="hover:text-blue-400 transition-colors">
                    <span className="font-medium text-white">{user.followingCount || 0}</span> following
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="hidden md:flex gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                  <Star className="h-4 w-4 fill-yellow-400" />
                  <span className="text-xl font-bold">{user.reputationScore.toFixed(1)}</span>
                </div>
                <p className="text-base text-slate-400">Reputation</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xl font-bold">{user.tradeCount}</span>
                </div>
                <p className="text-base text-slate-400">Trades</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
              <Star className="h-4 w-4 fill-yellow-400" />
              <span className="text-xl font-bold">{user.reputationScore.toFixed(1)}</span>
            </div>
            <p className="text-base text-slate-400">Reputation</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xl font-bold">{user.tradeCount}</span>
            </div>
            <p className="text-base text-slate-400">Trades</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800">
          <button
            onClick={() => handleTabChange("stats")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "stats"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Stats & Reviews
          </button>
          {!isOwnProfile && (
            <button
              onClick={() => handleTabChange("collection")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "collection"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Collection
            </button>
          )}
          {isOwnProfile && (
            <button
              onClick={() => handleTabChange("tickets")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "tickets"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Support Tickets
            </button>
          )}
        </div>

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
            <h2 className="text-xl font-bold mb-4">Trade Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-slate-400 text-base mb-1">Total Trades</p>
                <p className="text-2xl font-bold">{user.tradeCount}</p>
              </div>
              <div>
                <p className="text-slate-400 text-base mb-1">Reputation Score</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {user.reputationScore.toFixed(1)}
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                </p>
              </div>
              {isOwnProfile && currentUser && (
                <div>
                  <p className="text-slate-400 text-base mb-1">Account Status</p>
                  <p className="text-2xl font-bold">
                    {currentUser.isEmailVerified ? (
                      <span className="text-green-400">Verified</span>
                    ) : (
                      <span className="text-yellow-400">Unverified</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
              <p className="text-slate-400 text-base">No reviews yet</p>
            </div>
          </div>
        )}

        {/* Collection Tab */}
        {activeTab === "collection" && !isOwnProfile && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold">{user.username}'s Collection</h2>
                {!isLoadingCollection && (
                  <span className="text-base text-slate-400">({theirCollection.length} available)</span>
                )}
              </div>
              {currentUser && (
                <button
                  onClick={() => setIsTradeModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-700 hover:bg-green-600 text-white text-base transition-colors"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Propose Trade
                </button>
              )}
            </div>

            {isLoadingCollection ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : theirCollection.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">No cards available for trade</p>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {theirCollection.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-500 transition-colors"
                  >
                    {item.card.imageUrl ? (
                      <img
                        src={item.card.imageUrl}
                        alt={item.card.name}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-slate-700 flex items-center justify-center">
                        <Package className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-base font-medium truncate">{item.card.name}</p>
                      <p className="text-base text-slate-400 truncate">{item.card.setName}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base text-slate-400">{CONDITION_LABELS[item.condition]}</span>
                        {item.isFoil && (
                          <span className="text-base text-yellow-400 font-medium">Foil</span>
                        )}
                      </div>
                      <p className="text-base font-semibold text-green-400 mt-1">
                        {item.currentMarketValue != null
                          ? `$${item.currentMarketValue.toFixed(2)}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Support Tickets Tab */}
        {activeTab === "tickets" && isOwnProfile && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold">Support Tickets</h2>
              </div>
              <Link
                href="/support"
                className="flex items-center gap-1.5 text-base text-blue-400 hover:text-blue-300 transition-colors"
              >
                New ticket
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {tickets.length === 0 ? (
              <div className="p-12 text-center">
                <Headphones className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">No support tickets yet</p>
                <Link href="/support" className="text-base text-blue-400 hover:text-blue-300 transition-colors">
                  Submit a ticket →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {tickets.map((ticket) => {
                  const urgencyColor =
                    ticket.urgency === "URGENT"
                      ? "text-red-400 bg-red-500/10"
                      : ticket.urgency === "HIGH"
                      ? "text-orange-400 bg-orange-500/10"
                      : "text-slate-400 bg-slate-700/50";

                  const statusColors: Record<string, string> = {
                    OPEN: "text-blue-400 bg-blue-500/10",
                    IN_PROGRESS: "text-orange-400 bg-orange-500/10",
                    RESOLVED: "text-green-400 bg-green-500/10",
                  };

                  return (
                    <Link
                      key={ticket.id}
                      href={`/support/tickets/${ticket.ticketNumber}`}
                      className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-slate-800/50 transition-colors block"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-base text-slate-400">{ticket.ticketNumber}</span>
                          <span className={`text-base font-medium px-2 py-0.5 rounded-full ${urgencyColor}`}>
                            {ticket.urgency}
                          </span>
                          <span className={`text-base font-medium px-2 py-0.5 rounded-full ${statusColors[ticket.status] ?? "text-slate-400"}`}>
                            {ticket.status.replace("_", " ")}
                          </span>
                          <span className="text-base text-slate-400">
                            {ticket.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-base font-medium text-white truncate">{ticket.subject}</p>
                        {ticket.tradeCode && (
                          <p className="text-base text-slate-400 mt-0.5 font-mono">{ticket.tradeCode}</p>
                        )}
                      </div>
                      <p className="text-base text-slate-400 whitespace-nowrap flex-shrink-0">
                        {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Report Modal */}
      {showReportModal && user && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Flag className="h-4 w-4 text-red-400" /> Report @{user.username}
                </h2>
                <p className="text-base text-slate-400 mt-0.5">Reports are reviewed by our admin team</p>
              </div>
              <button onClick={() => { setShowReportModal(false); setReportSent(false); setReportReason(""); setReportDetails(""); }} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {reportSent ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <Flag className="h-6 w-6 text-green-400" />
                  </div>
                  <p className="text-white font-semibold">Report submitted</p>
                  <p className="text-base text-slate-400 mt-1">Our team will review it shortly.</p>
                  <button onClick={() => { setShowReportModal(false); setReportSent(false); setReportReason(""); setReportDetails(""); }} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-base font-medium transition-colors">
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-base text-slate-400 mb-1.5">Reason <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none h-4 w-4" />
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-base appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/50 pr-8"
                      >
                        <option value="">Select a reason…</option>
                        <option value="Card condition misrepresented">Card condition misrepresented</option>
                        <option value="Suspected scam or fraud">Suspected scam or fraud</option>
                        <option value="Counterfeit card">Counterfeit card</option>
                        <option value="Harassment or inappropriate behaviour">Harassment or inappropriate behaviour</option>
                        <option value="Spam or fake account">Spam or fake account</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-base text-slate-400 mb-1.5">Additional details <span className="text-slate-400">(optional)</span></label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Describe what happened…"
                      rows={3}
                      maxLength={1000}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleReport}
                      disabled={!reportReason || isReporting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-base font-semibold transition-colors"
                    >
                      {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                      Submit Report
                    </button>
                    <button onClick={() => setShowReportModal(false)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-base font-semibold transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trade Proposal Modal */}
      {user && !isOwnProfile && currentUser && (
        <TradeProposalModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          targetUser={user}
        />
      )}
    </div>
  );
}
