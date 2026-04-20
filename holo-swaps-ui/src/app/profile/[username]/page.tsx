"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { usersApi } from "@/lib/api/users";
import { User, CollectionItem } from "@/types";
import { Loader2, Star, TrendingUp, Package, MapPin, Calendar, UserPlus, UserMinus, Users, Repeat } from "lucide-react";
import { CONDITION_LABELS } from "@/types";
import { getInitials } from "@/lib/utils";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { TradeProposalModal } from "@/components/trades/TradeProposalModal";
import Link from "next/link";

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuthStore();

  const [user, setUser] = useState<User | null>(null);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"collection" | "stats">("collection");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  // Check if viewing own profile
  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const [profileData, collectionData] = await Promise.all([
          usersApi.getProfile(username),
          usersApi.getCollection(username, 1, 12),
        ]);
        setUser(profileData);
        setCollection(collectionData.data);
        setIsFollowing(profileData.isFollowing || false);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

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
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <Navbar />
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
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
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
              <div className="flex items-center gap-3 mb-2">
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
                      <>
                        <UserMinus className="h-4 w-4" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Follow
                      </>
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
                  Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Users className="h-4 w-4" />
                  <Link
                    href={`/profile/${username}/followers`}
                    className="hover:text-blue-400 transition-colors"
                  >
                    <span className="font-medium text-white">{user.followerCount || 0}</span> followers
                  </Link>
                  <span>·</span>
                  <Link
                    href={`/profile/${username}/following`}
                    className="hover:text-blue-400 transition-colors"
                  >
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
        <div className="flex items-center justify-between mb-6 border-b border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("collection")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "collection"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Collection ({collection.length})
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "stats"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Stats & Reviews
            </button>
          </div>
          {!isOwnProfile && currentUser && activeTab === "collection" && collection.length > 0 && (
            <button
              onClick={() => setIsTradeModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors mb-[-2px]"
            >
              <Repeat className="h-4 w-4" />
              Propose Trade
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "collection" && (
          <>
            {collection.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No cards in collection yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {collection.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors"
                  >
                    {item.card.imageUrl ? (
                      <img
                        src={item.card.imageUrl}
                        alt={item.card.name}
                        className="w-full aspect-[3/4] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-slate-800 flex items-center justify-center">
                        <Package className="h-12 w-12 text-slate-600" />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 truncate">{item.card.name}</h3>
                      <p className="text-xs text-slate-400 mb-2">{item.card.setName}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{CONDITION_LABELS[item.condition]}</span>
                        {item.isFoil && (
                          <span className="text-yellow-400">✨ Foil</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

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

            {/* Reviews Section - Placeholder */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
              <p className="text-slate-400 text-sm">No reviews yet</p>
            </div>
          </div>
        )}
      </main>

      {/* Trade Proposal Modal */}
      {user && (
        <TradeProposalModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          targetUser={user}
        />
      )}
    </div>
  );
}
