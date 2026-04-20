import { TradeStatus } from "@/types";
import { getTradeStatusLabel, getTradeStatusColor, cn } from "@/lib/utils";

interface TradeStatusBadgeProps {
  status: TradeStatus;
  className?: string;
}

export function TradeStatusBadge({ status, className }: TradeStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        getTradeStatusColor(status),
        className
      )}
    >
      {getTradeStatusLabel(status)}
    </span>
  );
}
