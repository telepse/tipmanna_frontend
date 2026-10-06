"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EXPLORE_COMMUNITY_HUB_HREF = "/explore?tab=my-communities";

function formatMembershipDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMembershipStatus(status?: string | null): string {
  if (!status) return "Active";
  return status.replace(/_/g, " ");
}

export type CommunityMemberInfoProps = {
  communityName?: string;
  membershipStatus?: string | null;
  membershipExpiresAt?: string | null;
  subscriptionExpiresAt?: string | null;
  className?: string;
  compact?: boolean;
};

export function CommunityMemberInfo({
  communityName,
  membershipStatus,
  membershipExpiresAt,
  subscriptionExpiresAt,
  className,
  compact = false,
}: CommunityMemberInfoProps) {
  const statusLabel = formatMembershipStatus(membershipStatus);
  const membershipEndLabel = membershipExpiresAt
    ? `Active until ${formatMembershipDate(membershipExpiresAt)}`
    : "No fixed end date";

  return (
    <div
      className={cn(
        "border-moonstone-blue-200 bg-moonstone-blue/20 space-y-3 rounded-lg border p-4",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h5 className="text-lg font-semibold">Your membership</h5>
        <Badge variant="default">{statusLabel}</Badge>
      </div>

      {communityName && !compact ? (
        <p className="text-sm font-medium">{communityName}</p>
      ) : null}

      <dl className="text-muted-foreground space-y-1.5 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-foreground font-medium">Access:</dt>
          <dd>{membershipEndLabel}</dd>
        </div>
        {subscriptionExpiresAt ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-foreground font-medium">Paid subscription:</dt>
            <dd>Active until {formatMembershipDate(subscriptionExpiresAt)}</dd>
          </div>
        ) : null}
      </dl>

      {!compact ? (
        <>
          <p className="text-muted-foreground text-sm">
            Browse your communities hub to watch content and manage your
            membership.
          </p>
          <Link
            href={EXPLORE_COMMUNITY_HUB_HREF}
            className="text-[10px] underline underline-offset-2 sm:text-xs"
          >
            Go to my community hub
          </Link>
        </>
      ) : null}
    </div>
  );
}
