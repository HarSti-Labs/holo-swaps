"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, UserSearchResult } from "@/lib/api/users";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { Search, UserPlus, UserMinus, Users, Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TIER_STYLES: Record<string, string> = {
  DIAMOND: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  GOLD:    "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  SILVER:  "bg-slate-400/20 text-slate-300 border border-slate-400/30",
  BRONZE:  "bg-orange-700/20 text-orange-400 border border-orange-700/30",
};

export default function FriendsPage() {
  const { user: me, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: () => usersApi.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const { data: following = [], isLoading: isLoadingFollowing } = useQuery({
    queryKey: ["following", me?.username],
    queryFn: () => usersApi.getFollowing(me!.username, 1, 50),
    enabled: !!me?.username,
    select: (r) => r.data,
  });

  const followMutation = useMutation({
    mutationFn: ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) =>
      isFollowing ? usersApi.unfollow(userId) : usersApi.follow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-search", debouncedQuery] });
      queryClient.invalidateQueries({ queryKey: ["following", me?.username] });
    },
  });

  if (!isAuthenticated) {
    router.replace("/auth/login");
    return null;
  }

  const showSearch = debouncedQuery.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-2xl">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Friends</h1>
          </div>
          <p className="text-slate-400 text-base ml-[52px]">Search for users and follow them to keep track of their collections.</p>
        </div>

        {/* Search box */}
        <div className="relative mb-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          {isSearching && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
          )}
        </div>

        {/* Search results */}
        {showSearch && (
          <section className="mb-10">
            <h2 className="text-base font-semibold text-slate-400 uppercase tracking-wider mb-3">Results</h2>
            {!isSearching && searchResults.length === 0 ? (
              <p className="text-slate-500 text-base py-4 text-center">No users found for &ldquo;{debouncedQuery}&rdquo;</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isPending={followMutation.isPending && followMutation.variables?.userId === user.id}
                    onToggleFollow={() => followMutation.mutate({ userId: user.id, isFollowing: user.isFollowing })}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* People you follow */}
        {!showSearch && (
          <section>
            <h2 className="text-base font-semibold text-slate-400 uppercase tracking-wider mb-3">
              People You Follow {following.length > 0 && <span className="text-slate-600 font-normal normal-case">· {following.length}</span>}
            </h2>
            {isLoadingFollowing ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : following.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-base">You&apos;re not following anyone yet.</p>
                <p className="text-base mt-1">Search above to find people!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {following.map((user) => (
                  <UserRow
                    key={user.id}
                    user={{ ...user, isFollowing: true, bio: user.bio ?? null, tier: (user as any).tier ?? null }}
                    isPending={followMutation.isPending && followMutation.variables?.userId === user.id}
                    onToggleFollow={() => followMutation.mutate({ userId: user.id, isFollowing: true })}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function UserRow({
  user,
  isPending,
  onToggleFollow,
}: {
  user: UserSearchResult;
  isPending: boolean;
  onToggleFollow: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 transition-colors">
      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-10 h-10 object-cover" />
          ) : (
            <span className="text-white font-bold">{user.username[0].toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-base truncate">{user.username}</span>
            {user.tier && TIER_STYLES[user.tier] && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${TIER_STYLES[user.tier]}`}>
                {user.tier[0]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-sm mt-0.5">
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{user.reputationScore.toFixed(1)}</span>
            <span>{user.tradeCount} trade{user.tradeCount !== 1 ? "s" : ""}</span>
            {user.bio && <span className="truncate hidden sm:block">{user.bio}</span>}
          </div>
        </div>
      </Link>
      <button
        onClick={onToggleFollow}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 disabled:opacity-50 ${
          user.isFollowing
            ? "bg-slate-700 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-slate-600 text-slate-300"
            : "bg-blue-600 hover:bg-blue-500 text-white"
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : user.isFollowing ? (
          <><UserMinus className="h-3.5 w-3.5" /> Following</>
        ) : (
          <><UserPlus className="h-3.5 w-3.5" /> Follow</>
        )}
      </button>
    </div>
  );
}
