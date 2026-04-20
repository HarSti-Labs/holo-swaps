"use client";

import Link from "next/link";
import { Trade } from "@/types";
import { TradeStatusBadge } from "./TradeStatusBadge";
import { formatCurrency, formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { ArrowLeftRight, DollarSign } from "lucide-react";

interface TradeCardProps {
  trade: Trade;
  className?: string;
}

export function TradeCard({ trade, className }: TradeCardProps) {
  const { user } = useAuthStore();
  const isProposer = user?.id === trade.proposer.id;
  const counterparty = isProposer ? trade.receiver : trade.proposer;

  const myItems = trade.items.filter((i) =>
    isProposer ? i.ownedByProposer : !i.ownedByProposer
  );
  const theirItems = trade.items.filter((i) =>
    isProposer ? !i.ownedByProposer : i.ownedByProposer
  );

  return (
    <Link href={`/trade/${trade.id}`}>
      <div
        className={cn(
          "bg-card border border-border rounded-xl p-4 card-hover cursor-pointer",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {getInitials(counterparty.username)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">@{counterparty.username}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(trade.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TradeStatusBadge status={trade.status} />
            <span className="text-xs text-muted-foreground font-mono">
              {trade.tradeCode}
            </span>
          </div>
        </div>

        {/* Cards being traded */}
        <div className="flex items-center gap-3">
          {/* Your cards */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1.5">You give</p>
            <div className="flex gap-1.5 flex-wrap">
              {myItems.slice(0, 3).map((item) => {
                const card =
                  item.proposerCollection?.card || item.receiverCollection?.card;
                return (
                  <span
                    key={item.id}
                    className="text-xs bg-muted px-2 py-1 rounded-md font-medium"
                  >
                    {card?.name ?? "Unknown"}
                  </span>
                );
              })}
              {myItems.length > 3 && (
                <span className="text-xs text-muted-foreground px-1 py-1">
                  +{myItems.length - 3} more
                </span>
              )}
            </div>
          </div>

          <ArrowLeftRight size={16} className="text-muted-foreground shrink-0" />

          {/* Their cards */}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1.5">You receive</p>
            <div className="flex gap-1.5 flex-wrap">
              {theirItems.slice(0, 3).map((item) => {
                const card =
                  item.proposerCollection?.card || item.receiverCollection?.card;
                return (
                  <span
                    key={item.id}
                    className="text-xs bg-muted px-2 py-1 rounded-md font-medium"
                  >
                    {card?.name ?? "Unknown"}
                  </span>
                );
              })}
              {theirItems.length > 3 && (
                <span className="text-xs text-muted-foreground px-1 py-1">
                  +{theirItems.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cash difference */}
        {trade.cashDifference > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5">
            <DollarSign size={14} className="text-accent" />
            <span className="text-sm">
              {trade.cashPayerId === user?.id ? (
                <span>
                  You pay{" "}
                  <strong className="text-accent">
                    {formatCurrency(trade.cashDifference)}
                  </strong>{" "}
                  difference
                </span>
              ) : (
                <span>
                  You receive{" "}
                  <strong className="text-emerald-500">
                    {formatCurrency(trade.cashDifference)}
                  </strong>{" "}
                  difference
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
