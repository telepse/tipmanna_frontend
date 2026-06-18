"use client";

import { BadgeCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getChannelCommentDrawerAction } from "@/actions/messages";
import { cn } from "@/lib/utils";
import {
  VIDEO_SURFACE_BADGE_CHIP,
  VIDEO_SURFACE_BADGE_LABEL,
  videoSurfaceBadgeLabelPos,
} from "@/components/video/video-surface-badge-styles";

type Props = {
  /** Approved co-owner display names (shown on chip click). */
  coOwnerNames?: string[];
  coOwnerName?: string | null;
  /** Resolve names from drawer API when missing on the video payload. */
  channelId?: string;
  eventId?: string;
  /** When a community badge sits at the default corner, nudge this chip down. */
  stackBelowCommunity?: boolean;
  className?: string;
  position?: "top-left" | "top-right";
  /** Flow inside a parent badge stack (no absolute corner placement). */
  inline?: boolean;
};

function normalizeCoOwnerNames(
  names?: string[],
  single?: string | null
): string[] {
  const fromList = (names ?? []).map(n => n?.trim()).filter(Boolean) as string[];
  if (fromList.length) return fromList;
  const one = single?.trim();
  return one ? [one] : [];
}

/**
 * Optional surface indicator that co-owner approvals are on file for revenue share.
 * Click toggles the co-owner name(s), similar to the community badge (no navigation).
 */
export function CoOwnerApprovedBadge({
  coOwnerNames,
  coOwnerName,
  channelId,
  eventId,
  stackBelowCommunity,
  className,
  position = "top-right",
  inline = false,
}: Props) {
  const [showName, setShowName] = useState(false);
  const [fetchedNames, setFetchedNames] = useState<string[]>([]);

  const propNames = useMemo(
    () => normalizeCoOwnerNames(coOwnerNames, coOwnerName),
    [coOwnerNames, coOwnerName]
  );

  useEffect(() => {
    setFetchedNames([]);
    setShowName(false);
  }, [channelId, eventId, propNames.join("|")]);

  useEffect(() => {
    if (propNames.length || !channelId || !eventId) return;
    let cancelled = false;
    void getChannelCommentDrawerAction(eventId, channelId).then(res => {
      if (cancelled || !res.success || !res.data?.channel) return;
      const ch = res.data.channel;
      const resolved = normalizeCoOwnerNames(
        ch.coOwnerNames,
        ch.coOwnerName
      );
      if (resolved.length) setFetchedNames(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [channelId, eventId, propNames.length]);

  const displayNames = propNames.length ? propNames : fetchedNames;
  const label = displayNames.join(", ");
  const labelPos = videoSurfaceBadgeLabelPos(position);

  return (
    <div
      title={label || "Co-owner"}
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
      aria-label={label ? `Co-owner: ${label}` : "Co-owner"}
    >
      <button
        type="button"
        className={cn(
          VIDEO_SURFACE_BADGE_CHIP,
          "bg-white text-black",
          !label && "opacity-90"
        )}
        aria-expanded={showName}
        disabled={!label}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          if (!label) return;
          setShowName(prev => !prev);
        }}
      >
        <BadgeCheck
          className="size-3.5 shrink-0"
          aria-hidden
        />
      </button>

      {label ? (
        <span
          className={cn(
            VIDEO_SURFACE_BADGE_LABEL,
            labelPos,
            showName ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          aria-hidden={!showName}
        >
          {label} is a co-owner of this video.
        </span>
      ) : null}
    </div>
  );
}
