"use client";

import Image from "next/image";
import { CollectionItem } from "@/types";
import { formatCurrency, getConditionLabel, getConditionColor, cn } from "@/lib/utils";
import { ArrowLeftRight, Pencil, Trash2 } from "lucide-react";

interface CollectionCardProps {
  item: CollectionItem;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (item: CollectionItem) => void;
  onEdit?: (item: CollectionItem) => void;
  onDelete?: (item: CollectionItem) => void;
  showActions?: boolean;
}

export function CollectionCard({
  item,
  selectable,
  selected,
  onSelect,
  onEdit,
  onDelete,
  showActions,
}: CollectionCardProps) {
  return (
    <div
      onClick={() => selectable && onSelect?.(item)}
      className={cn(
        "bg-card border rounded-xl overflow-hidden transition-all duration-200",
        selectable && "cursor-pointer",
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10"
          : "border-border hover:border-border/80 hover:shadow-md",
        item.status !== "AVAILABLE" && "opacity-60"
      )}
    >
      {/* Card image */}
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {item.card.imageUrl ? (
          <Image
            src={item.card.imageUrl}
            alt={item.card.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : item.photos[0] ? (
          <Image
            src={item.photos[0]}
            alt={item.card.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🃏</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {item.isFoil && (
            <span className="text-base bg-yellow-400/90 text-yellow-900 px-1.5 py-0.5 rounded font-medium">
              Foil
            </span>
          )}
          {item.isFirstEdition && (
            <span className="text-base bg-purple-500/90 text-white px-1.5 py-0.5 rounded font-medium">
              1st Ed
            </span>
          )}
        </div>

        {/* Available for trade badge */}
        {item.status === "AVAILABLE" && (
          <div className="absolute top-2 right-2">
            <ArrowLeftRight
              size={14}
              className="text-white drop-shadow-md"
            />
          </div>
        )}

        {/* Selected overlay */}
        {selected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-lg">✓</span>
            </div>
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-3">
        <p className="font-display font-semibold text-base leading-tight line-clamp-1">
          {item.card.name}
        </p>
        <p className="text-base text-muted-foreground mt-0.5 line-clamp-1">
          {item.card.setName} · #{item.card.cardNumber}
        </p>

        <div className="flex items-center justify-between mt-2">
          <span
            className={cn(
              "text-base font-medium",
              getConditionColor(item.condition)
            )}
          >
            {getConditionLabel(item.condition)}
          </span>
          <span className="text-base font-semibold font-mono">
            {item.askingValueOverride
              ? formatCurrency(item.askingValueOverride)
              : item.currentMarketValue
              ? formatCurrency(item.currentMarketValue)
              : "—"}
          </span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(item);
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-base text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(item);
              }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-base text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
