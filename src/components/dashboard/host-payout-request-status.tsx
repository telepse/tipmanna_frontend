"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HostPayoutRequestStatus } from "@/actions/host-payouts";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";

export type PayoutRequestReason =
  | "profile_incomplete"
  | "co_owner_outstanding"
  | "payouts_frozen"
  | "no_balance"
  | "cooldown"
  | "request_pending"
  | "eligible";

const REASON_COPY: Record<Exclude<PayoutRequestReason, "eligible">, string> = {
  profile_incomplete: "Complete your host profile before requesting a payout.",
  co_owner_outstanding:
    "Settle outstanding co-owner obligations before requesting a payout.",
  payouts_frozen:
    "Payouts are temporarily frozen until co-owner obligations are resolved.",
  no_balance: "You have no pending balance to request.",
  cooldown: "You can request another payout after the cooldown period ends.",
  request_pending: "You already have a payout request awaiting review.",
};

type HostPayoutRequestStatusProps = {
  requestPayout: HostPayoutRequestStatus | null;
  slug?: string;
  settingsProfileTab?: string;
  compact?: boolean;
};

export function HostPayoutRequestStatusPanel({
  requestPayout,
  slug,
  settingsProfileTab = "individual_profile",
  compact = false,
}: HostPayoutRequestStatusProps) {
  if (!requestPayout) return null;

  const profileLabel =
    requestPayout.profileAccountType === "ORGANIZATION"
      ? "organisation profile"
      : "individual profile";

  const settingsUrl = slug
    ? `/host/${slug}/settings?tab=${settingsProfileTab}`
    : `/host/settings?tab=${settingsProfileTab}`;

  const coOwnersUrl = slug
    ? `/host/${slug}/host-premium?tab=video_coowners`
    : undefined;

  const blockingReasons = requestPayout.reasons.filter(
    (r): r is Exclude<PayoutRequestReason, "eligible"> => r !== "eligible"
  );

  if (requestPayout.pendingRequest) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <p className="font-medium">Payout request pending review</p>
        <p className="mt-1">
          {formatGbpMinor(requestPayout.pendingRequest.amountMinor)} submitted{" "}
          {new Date(requestPayout.pendingRequest.requestedAt).toLocaleString()}.
          Tipmanna will process this manually; you will be notified when it is
          settled.
        </p>
      </div>
    );
  }

  if (requestPayout.canRequest) {
    if (compact) return null;
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <p className="font-medium">Ready to request payout</p>
        <p className="mt-1">
          Pending balance: {formatGbpMinor(requestPayout.pendingMinor ?? 0)}
          {requestPayout.payableBreakdown ? (
            <>
              {" "}
              (Event tips:{" "}
              {formatGbpMinor(requestPayout.payableBreakdown.eventTipsMinor)} ·
              Community:{" "}
              {formatGbpMinor(
                requestPayout.payableBreakdown.communitySubscriptionMinor
              )}
              )
            </>
          ) : null}
        </p>
      </div>
    );
  }

  if (blockingReasons.length === 0) return null;

  return (
    <div className="space-y-2">
      {blockingReasons.map(reason => (
        <div
          key={reason}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{reason.replace(/_/g, " ")}</Badge>
            <span>{REASON_COPY[reason]}</span>
          </div>
          {reason === "profile_incomplete" ? (
            <Link
              href={settingsUrl}
              className="text-primary mt-2 inline-block font-medium underline"
            >
              Complete {profileLabel} →
            </Link>
          ) : null}
          {reason === "co_owner_outstanding" &&
          requestPayout.coOwnerOutstandingMinor > 0 ? (
            <p className="mt-1">
              Outstanding:{" "}
              {formatGbpMinor(requestPayout.coOwnerOutstandingMinor)}
            </p>
          ) : null}
          {reason === "co_owner_outstanding" && coOwnersUrl ? (
            <Link
              href={coOwnersUrl}
              className="text-primary mt-2 inline-block font-medium underline"
            >
              Video Co-owners →
            </Link>
          ) : null}
          {reason === "cooldown" && requestPayout.cooldownEndsAt ? (
            <p className="mt-1">
              Available after{" "}
              {new Date(requestPayout.cooldownEndsAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
