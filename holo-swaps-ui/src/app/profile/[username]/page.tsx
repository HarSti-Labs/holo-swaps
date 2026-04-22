"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usersApi } from "@/lib/api/users";
import { supportApi, SupportTicketSummary } from "@/lib/api/support";
import { collectionApi } from "@/lib/api/collection";
import { User, CollectionItem, CONDITION_LABELS } from "@/types";
import { Loader2, Star, TrendingUp, MapPin, Calendar, UserPlus, UserMinus, Users, Headphones, ChevronRight, Package, ArrowLeftRight } from "lucide-react";
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
        setIsFollowing(profileData.isFollowing || false);

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
                  <button
                    onClick={handleFollow}
                    disabled={isFollowLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? "bg-slate-700 hover:bg-slate-600 text-white"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isFollowing ? (
                      <><UserMinus className="h-4 w-4" /> Unfollow</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> Follow</>
                    )}
                  </button>
                )}
              </div>

              {user.bio && <p className="text-slate-400 mb-4">{user.bio}</p>}

              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
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
                <p className="text-xs text-slate-400">Reputation</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xl font-bold">{user.tradeCount}</span>
                </div>
                <p className="text-xs text-slate-400">Trades</p>
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
            <p className="text-xs text-slate-400">Reputation</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xl font-bold">{user.tradeCount}</span>
            </div>
            <p className="text-xs text-slate-400">Trades</p>
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
                <p className="text-slate-400 text-sm mb-1">Total Trades</p>
                <p className="text-2xl font-bold">{user.tradeCount}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Reputation Score</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {user.reputationScore.toFixed(1)}
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                </p>
              </div>
              {isOwnProfile && currentUser && (
                <div>
                  <p className="text-slate-400 text-sm mb-1">Account Status</p>
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
              <p className="text-slate-400 text-sm">No reviews yet</p>
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
                  <span className="text-sm text-slate-400">({theirCollection.length} available)</span>
                )}
              </div>
              {currentUser && (
                <button
                  onClick={() => setIsTradeModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-700 hover:bg-green-600 text-white text-sm transition-colors"
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
                <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
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
                        <Package className="h-8 w-8 text-slate-500" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{item.card.name}</p>
                      <p className="text-xs text-slate-400 truncate">{item.card.setName}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">{CONDITION_LABELS[item.condition]}</span>
                        {item.isFoil && (
                          <span className="text-xs text-yellow-400 font-medium">Foil</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-green-400 mt-1">
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
                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                New ticket
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {tickets.length === 0 ? (
              <div className="p-12 text-center">
                <Headphones className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">No support tickets yet</p>
                <Link href="/support" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
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
                          <span className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyColor}`}>
                            {ticket.urgency}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[ticket.status] ?? "text-slate-400"}`}>
                            {ticket.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-slate-500">
                            {ticket.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                        {ticket.tradeCode && (
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">{ticket.tradeCode}</p>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
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
