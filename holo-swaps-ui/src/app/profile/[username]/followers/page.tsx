"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { User } from "@/types";
import api from "@/lib/api/client";
import { Loader2, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FollowersPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [followers, setFollowers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadFollowers();
  }, [username, page]);

  const loadFollowers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/users/${username}/followers?page=${page}&limit=20`);
      setFollowers(res.data.data.data);
      setTotal(res.data.data.total);
      setTotalPages(res.data.data.totalPages);
    } catch (err) {
      console.error("Failed to load followers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Followers</h1>
          <p className="text-slate-400">
            {total} {total === 1 ? "follower" : "followers"} of @{username}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-lg">No followers yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {followers.map((follower) => (
                <Link
                  key={follower.id}
                  href={`/profile/${follower.username}`}
                  className="block bg-slate-900/50 border border-slate-800 hover:border-blue-500 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {follower.avatarUrl ? (
                      <img
                        src={follower.avatarUrl}
                        alt={follower.username}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                        {follower.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg">
                        {follower.username}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                        <span>
                          {follower.tradeCount || 0} {follower.tradeCount === 1 ? "trade" : "trades"}
                        </span>
                        <span>⭐ {follower.reputationScore?.toFixed(1) || "0.0"}</span>
                        {follower.tier && (
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-xs uppercase">
                            {follower.tier}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors"
                >
                  Previous
                </button>
                <span className="text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
