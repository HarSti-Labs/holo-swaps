import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CardCondition, TradeStatus, CONDITION_LABELS, TRADE_STATUS_LABELS } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getConditionLabel(condition: CardCondition): string {
  return CONDITION_LABELS[condition] ?? condition;
}

export function getConditionColor(condition: CardCondition): string {
  const colors: Record<CardCondition, string> = {
    MINT: "text-emerald-500",
    NEAR_MINT: "text-green-500",
    LIGHTLY_PLAYED: "text-yellow-500",
    MODERATELY_PLAYED: "text-orange-500",
    HEAVILY_PLAYED: "text-red-500",
    DAMAGED: "text-red-700",
  };
  return colors[condition] ?? "text-muted-foreground";
}

export function getTradeStatusLabel(status: TradeStatus): string {
  return TRADE_STATUS_LABELS[status] ?? status;
}

export function getTradeStatusColor(status: TradeStatus): string {
  const colors: Record<TradeStatus, string> = {
    PROPOSED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    COUNTERED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    BOTH_SHIPPED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    A_RECEIVED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    B_RECEIVED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    BOTH_RECEIVED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    VERIFIED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    DISPUTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return colors[status] ?? "bg-muted text-muted-foreground";
}

export function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}
