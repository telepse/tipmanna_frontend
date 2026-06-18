"use client";

import { CommunityCBadge } from "@/components/community/community-c-badge";
import { CoOwnerApprovedBadge } from "@/components/co-owner/co-owner-approved-badge";
import { cn } from "@/lib/utils";

export type VideoSurfaceBadgeCommunity = {
  id: string;
  name: string;
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

/**
 * Top-corner badge stack for video surfaces — community + co-owner when both apply.
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
  const hasCommunity = Boolean(community?.id && community?.name);
  const hasCoOwner = Boolean(coOwnerApproved);

  if (!hasCommunity && !hasCoOwner) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[55] flex flex-col gap-1.5 overflow-visible",
        hasCommunity ? "top-12" : "top-3",
        position === "top-right"
          ? "right-3 items-end"
          : "left-3 items-start",
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
