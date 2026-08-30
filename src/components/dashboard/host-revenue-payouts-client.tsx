"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import Link from "next/link";
import { useParams } from "next/navigation";

import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { IncompleteProfilePayoutModal } from "@/components/dashboard/incomplete-profile-payout-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  acceptPayoutSettlementAction,
  requestHostPayoutAction,
} from "@/actions/host-payouts";
import { useHostPayoutSummary } from "@/hooks/useHostPayoutSummary";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";
import type { RootState } from "@/redux/store";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

function branchLabel(branch: string) {
  if (branch === "event_tip") return "Event tips";
  if (branch === "community_subscription") return "Community subscription";
  if (branch === "host_subscription") return "Host subscription";
  return branch;
}

export function HostRevenuePayoutsClient() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const {
    summary,
    pendingSettlements,
    host,
    communities,
    requestPayout,
    isLoading,
    refresh,
  } = useHostPayoutSummary();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const profileAccountType = requestPayout?.profileAccountType ?? "INDIVIDUAL";
  const profileLabel =
    profileAccountType === "ORGANIZATION"
      ? "organisation profile"
      : "individual profile";
  const settingsProfileTab =
    profileAccountType === "ORGANIZATION"
      ? "organisation_profile"
      : "individual_profile";

  const handleRequestPayout = async () => {
    if (!requestPayout) return;

    if (!requestPayout.profileComplete) {
      setProfileModalOpen(true);
      return;
    }

    if (requestPayout.hasCoOwnerObligations) {
      return;
    }

    if (!authToken) {
      toast.error("Not signed in");
      return;
    }

    setRequestingPayout(true);
    try {
      const res = await requestHostPayoutAction(authToken);
      if (!res.success) {
        toast.error(res.message ?? "Could not submit payout request");
        return;
      }
      toast.success(res.data?.message ?? "Payout request submitted");
      await refresh();
    } finally {
      setRequestingPayout(false);
    }
  };

  const load = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const hostChannel = subscribeChannel(`host-${userId}`);
    const communityChannel = subscribeChannel(`community-host-${userId}`);
    const onUpdate = () => {
      toast.info("Payout updated");
      void load();
    };
    if (hostChannel) hostChannel.bind("payout-pending-ack", onUpdate);
    if (communityChannel)
      communityChannel.bind("community-payout-settled", onUpdate);
    return () => {
      if (hostChannel) hostChannel.unbind("payout-pending-ack", onUpdate);
      if (communityChannel)
        communityChannel.unbind("community-payout-settled", onUpdate);
      unsubscribeChannel(`host-${userId}`);
      unsubscribeChannel(`community-host-${userId}`);
    };
  }, [load, userId]);

  const allObligations = [...host, ...communities];

  return (
    <section className="space-y-6">
      <DashboardHeading
        title="Revenue & Payouts"
        subtitle="Track what Tipmanna owes you (70% share), confirm payouts, and review settlement history."
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        Host payee share is <strong>70%</strong> of gross tips and community
        subscription revenue. Admin settles outstanding balances manually; you
        confirm receipt here.
      </div>

      {requestPayout?.hasCoOwnerObligations ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          You have outstanding co-owner obligations
          {requestPayout.coOwnerOutstandingMinor > 0
            ? ` (${formatGbpMinor(requestPayout.coOwnerOutstandingMinor)})`
            : ""}
          . Settle these in{" "}
          {slug ? (
            <Link
              href={`/host/${slug}/host-premium?tab=video_coowners`}
              className="font-medium underline"
            >
              Video Co-owners
            </Link>
          ) : (
            "Video Co-owners"
          )}{" "}
          before requesting a payout.
        </div>
      ) : null}

      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div>
          <p className="font-medium">Request payout</p>
          <p className="text-muted-foreground text-sm">
            Ask Tipmanna to review and send your pending balance.
          </p>
        </div>
        <Button
          type="button"
          disabled={
            requestingPayout ||
            isLoading ||
            !requestPayout ||
            requestPayout.hasCoOwnerObligations ||
            (requestPayout.profileComplete && !requestPayout.canRequest)
          }
          onClick={() => void handleRequestPayout()}
        >
          {requestingPayout ? "Submitting…" : "Request payout"}
        </Button>
      </div>

      {isLoading && !summary ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Pending payouts</p>
              <p className="text-2xl font-semibold">
                {formatGbpMinor(summary?.pendingMinor ?? 0)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Event tips:{" "}
                {formatGbpMinor(summary?.pendingByBranch.eventTipsMinor ?? 0)} ·
                Community:{" "}
                {formatGbpMinor(
                  summary?.pendingByBranch.communitySubscriptionMinor ?? 0
                )}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Total received</p>
              <p className="text-2xl font-semibold">
                {formatGbpMinor(summary?.receivedMinor ?? 0)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Event tips:{" "}
                {formatGbpMinor(summary?.receivedByBranch.eventTipsMinor ?? 0)}{" "}
                · Community:{" "}
                {formatGbpMinor(
                  summary?.receivedByBranch.communitySubscriptionMinor ?? 0
                )}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">
                Awaiting confirmation
              </p>
              <p className="text-2xl font-semibold">
                {summary?.pendingAckCount ?? 0}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Payouts sent by admin
              </p>
            </div>
            <div className="bg-card flex flex-col justify-center rounded-lg border p-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void load()}
              >
                Refresh
              </Button>
              {slug ? (
                <Link
                  href={`/host/${slug}/reports`}
                  className="text-primary mt-2 text-xs underline"
                >
                  View earnings reports →
                </Link>
              ) : null}
            </div>
          </div>

          {pendingSettlements.length > 0 ? (
            <div className="bg-card space-y-3 rounded-lg border p-4">
              <p className="font-medium">Payouts awaiting your confirmation</p>
              {pendingSettlements.map(row => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 first:border-t-0 first:pt-0"
                >
                  <div>
                    <p className="text-sm">{row.label}</p>
                    <p className="text-lg font-semibold">
                      {formatGbpMinor(row.amountMinor)}
                    </p>
                    {row.receiptUrl ? (
                      <a
                        href={row.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-xs underline"
                      >
                        View receipt
                      </a>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      void acceptPayoutSettlementAction(authToken, row.id).then(
                        r => {
                          if (r.success) {
                            toast.success("Payout acknowledged");
                            void load();
                          } else {
                            toast.error(r.message ?? "Could not accept");
                          }
                        }
                      );
                    }}
                  >
                    Accept payout
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="bg-card space-y-3 rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Obligations by branch</h2>
            {allObligations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No payout obligations yet. They appear when you receive tips or
                community subscriptions.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-2">Branch</th>
                      <th className="p-2">Payee</th>
                      <th className="p-2">Owed</th>
                      <th className="p-2">Cleared</th>
                      <th className="p-2">Outstanding</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allObligations.map(row => (
                      <tr
                        key={row.id}
                        className="border-b last:border-0"
                      >
                        <td className="p-2">{branchLabel(row.branch)}</td>
                        <td className="p-2">
                          {row.communityName ?? "Your host account"}
                        </td>
                        <td className="p-2">
                          {formatGbpMinor(row.amountOwedMinor)}
                        </td>
                        <td className="p-2">
                          {formatGbpMinor(row.amountClearedMinor)}
                        </td>
                        <td className="p-2 font-medium">
                          {formatGbpMinor(row.outstandingMinor)}
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary">{row.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-card space-y-3 rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Settlement history</h2>
            {allObligations.every(o => !(o.settlements?.length ?? 0)) ? (
              <p className="text-muted-foreground text-sm">
                No settlements recorded yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {allObligations.flatMap(o =>
                  (o.settlements ?? []).map(s => (
                    <li
                      key={s.id}
                      className="flex flex-wrap justify-between gap-2 border-b pb-2"
                    >
                      <span>
                        {branchLabel(o.branch)} · {s.status} ·{" "}
                        {new Date(s.createdAt).toLocaleString()}
                      </span>
                      <span className="font-medium">
                        {formatGbpMinor(s.amountMinor)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </>
      )}
      <IncompleteProfilePayoutModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        settingsUrl={
          slug
            ? `/host/${slug}/settings?tab=${settingsProfileTab}`
            : `/host/settings?tab=${settingsProfileTab}`
        }
        profileLabel={profileLabel}
      />
    </section>
  );
}
