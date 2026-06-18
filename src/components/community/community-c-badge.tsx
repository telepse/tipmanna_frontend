"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  VIDEO_SURFACE_BADGE_CHIP,
  VIDEO_SURFACE_BADGE_LABEL,
  videoSurfaceBadgeLabelPos,
} from "@/components/video/video-surface-badge-styles";

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
  const labelPos = videoSurfaceBadgeLabelPos(position);
  const [showCommunityName, setShowCommunityName] = useState(false);

  return (
    <div
      title={community.name}
      className={cn(
        "z-[55] flex items-center justify-center",
        "pointer-events-auto overflow-visible",
        inline ? "relative" : cn("absolute top-12", pos),
        className
      )}
      aria-label={`Community: ${community.name}`}
    >
      <button
        type="button"
        className={cn(
          VIDEO_SURFACE_BADGE_CHIP,
          "from-white bg-gradient-to-br to-white/90 text-xs font-black text-black"
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
          VIDEO_SURFACE_BADGE_LABEL,
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
