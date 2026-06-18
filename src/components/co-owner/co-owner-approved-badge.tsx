"use client";

import { BadgeCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Approved co-owner display names (shown on chip click). */
  coOwnerNames?: string[];
  /** When a community badge sits at the default corner, nudge this chip down. */
  stackBelowCommunity?: boolean;
  className?: string;
  position?: "top-left" | "top-right";
  /** Flow inside a parent badge stack (no absolute corner placement). */
  inline?: boolean;
};

/**
 * Optional surface indicator that co-owner approvals are on file for revenue share.
 * Click toggles the co-owner name(s), similar to the community badge (no navigation).
 */
export function CoOwnerApprovedBadge({
  coOwnerNames = [],
  stackBelowCommunity,
  className,
  position = "top-right",
  inline = false,
}: Props) {
  const [showName, setShowName] = useState(false);
  const label = coOwnerNames.filter(Boolean).join(", ") || "Co-owner";
  const labelPos =
    position === "top-right" ? "right-full mr-2" : "left-full ml-2";

  return (
    <div
      title={label}
      className={cn(
        "pointer-events-auto z-[54] flex items-center overflow-visible",
        inline
          ? "relative"
          : cn(
              "absolute",
              position === "top-right" ? "right-3 left-auto" : "left-3 right-auto",
              stackBelowCommunity ? "top-[5.25rem]" : "top-3"
            ),
        className
      )}
      aria-label={`Co-owner: ${label}`}
    >
      <button
        type="button"
        className={cn(
          "flex items-center gap-1 rounded-full",
          "bg-emerald-700/95 px-2 py-1 text-[10px] font-semibold text-white shadow-md ring-1 ring-white/30",
          "transition hover:scale-105 hover:ring-white/50"
        )}
        aria-expanded={showName}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setShowName(prev => !prev);
        }}
      >
        <BadgeCheck
          className="size-3.5 shrink-0"
          aria-hidden
        />
        <span>Co-owner</span>
      </button>

      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-xs font-medium whitespace-nowrap text-black shadow-lg ring-1 ring-black/10 transition",
          labelPos,
          showName ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!showName}
      >
        {label}
      </span>
    </div>
  );
}
