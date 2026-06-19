"use client";

import {
  CommunityCBadge,
  type CommunityBadgeInfo,
} from "@/components/community/community-c-badge";
import { CoOwnerApprovedBadge } from "@/components/co-owner/co-owner-approved-badge";
import { cn } from "@/lib/utils";

export type VideoSurfaceBadgeCommunity = CommunityBadgeInfo;

export type VideoSurfaceBadgeChannel = {
  community?: VideoSurfaceBadgeCommunity | null;
  coOwnerApproved?: boolean;
  coOwnerNames?: string[];
  coOwnerName?: string | null;
  id?: string | number;
};

type Props = {
  community?: VideoSurfaceBadgeCommunity | null;
  coOwnerApproved?: boolean;
  coOwnerNames?: string[];
  coOwnerName?: string | null;
  channelId?: string;
  eventId?: string;
  position?: "top-left" | "top-right";
  className?: string;
};

/** Resolve badge props from a channel/content payload (TV, room, explore). */
export function pickVideoSurfaceBadgeProps(
  channel: VideoSurfaceBadgeChannel | null | undefined,
  eventId?: string
): Props {
  const coOwnerApproved = Boolean(channel?.coOwnerApproved);
  const community =
    channel?.community?.id && channel?.community?.name
      ? channel.community
      : null;

  return {
    community,
    coOwnerApproved,
    coOwnerNames: channel?.coOwnerNames,
    coOwnerName: channel?.coOwnerName,
    channelId: channel?.id != null ? String(channel.id) : undefined,
    eventId,
  };
}

/**
 * Top-corner badge stack for video surfaces.
 * Co-owned clips show the co-owner badge; community-bank clips show the C badge.
 * Co-owned community-bank videos show both (community metadata is server-enriched).
 */
export function VideoSurfaceBadges({
  community,
  coOwnerApproved,
  coOwnerNames,
  coOwnerName,
  channelId,
  eventId,
  position = "top-right",
  className,
}: Props) {
  const hasCoOwner = Boolean(coOwnerApproved);
  const hasCommunity = Boolean(community?.id && community?.name);

  if (!hasCommunity && !hasCoOwner) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[55] flex flex-col gap-1.5 overflow-visible",
        hasCommunity ? "top-12" : "top-3",
        position === "top-right" ? "right-3 items-end" : "left-3 items-start",
        className
      )}
    >
      {hasCommunity ? (
        <CommunityCBadge
          community={community!}
          position={position}
          inline
        />
      ) : null}
      {hasCoOwner ? (
        <CoOwnerApprovedBadge
          coOwnerNames={coOwnerNames}
          coOwnerName={coOwnerName}
          channelId={channelId}
          eventId={eventId}
          position={position}
          inline
        />
      ) : null}
    </div>
  );
}
