"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type CommunityBadgeInfo = {
  id: string;
  name: string;
};

type Props = {
  community: CommunityBadgeInfo;
  className?: string;
  position?: "top-left" | "top-right";
  /** Flow inside a parent badge stack (no absolute corner placement). */
  inline?: boolean;
};

/**
 * Compact “community” chip for video surfaces — links to the community page.
 */
export function CommunityCBadge({
  community,
  className,
  position = "top-left",
  inline = false,
}: Props) {
  const pos =
    position === "top-right" ? "right-3 left-auto" : "left-3 right-auto";
  const labelPos =
    position === "top-right" ? "right-full mr-2" : "left-full ml-2";
  const [showCommunityName, setShowCommunityName] = useState(false);

  return (
    <div
      title={community.name}
      className={cn(
        "z-[55] flex size-7 items-center justify-center",
        "pointer-events-auto overflow-visible",
        inline ? "relative" : cn("absolute top-12", pos),
        className
      )}
      aria-label={`Community: ${community.name}`}
    >
      <button
        type="button"
        className={cn(
          "flex size-7 items-center justify-center rounded-full",
          "from-moonstone-blue bg-gradient-to-br to-white/90 text-sm font-black text-white shadow-lg",
          "ring-2 ring-white/25 transition hover:scale-105 hover:ring-white/50"
        )}
        aria-expanded={showCommunityName}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setShowCommunityName(prev => !prev);
        }}
      >
        C
      </button>

      <Link
        href={`/explore?tab=join&joinCommunity=${encodeURIComponent(community.id)}`}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-xs font-medium whitespace-nowrap text-black shadow-lg ring-1 ring-black/10 transition",
          labelPos,
          showCommunityName
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={e => {
          e.stopPropagation();
        }}
      >
        {community.name}
      </Link>
    </div>
  );
}
