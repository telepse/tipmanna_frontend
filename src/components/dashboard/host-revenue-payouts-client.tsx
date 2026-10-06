"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import Link from "next/link";
import { useParams } from "next/navigation";

import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { HostConnectPayoutPanel } from "@/components/dashboard/host-connect-payout-panel";
import { HostPayoutRequestStatusPanel } from "@/components/dashboard/host-payout-request-status";
import { IncompleteProfilePayoutModal } from "@/components/dashboard/incomplete-profile-payout-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  acceptPayoutSettlementAction,
  requestHostPayoutAction,
} from "@/actions/host-payouts";
import { useHostPayoutSummary } from "@/hooks/useHostPayoutSummary";
import { useStripeConnectReturnHandler } from "@/hooks/use-stripe-connect-return";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";
import { hostPayoutRequestErrorMessage } from "@/lib/host-payout-request-error";
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
    connectPayouts,
    isPending,
    payoutUiState,
    refresh,
  } = useHostPayoutSummary();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const connectEnabled = connectPayouts?.enabled === true;
  const connectReady = connectPayouts?.connect?.payoutsEnabled === true;

  const { handleConnectQuery } = useStripeConnectReturnHandler({
    slug,
    onSynced: refresh,
  });

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

    if (!authToken) {
      toast.error("Not signed in");
      return;
    }

    setRequestingPayout(true);
    try {
      const res = await requestHostPayoutAction(authToken);
      if (!res.success) {
        toast.error(
          hostPayoutRequestErrorMessage(
            res.message ?? "Could not submit payout request",
            res.validationBody
          )
        );
        await refresh();
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
    void handleConnectQuery();
  }, [handleConnectQuery]);

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
        subscription revenue.
        {connectReady ? (
          <>
            {" "}
            With Stripe Connect enabled, eligible payout requests are processed
            automatically each month — no receipt upload required.
          </>
        ) : connectEnabled ? (
          <>
            {" "}
            Set up Stripe Connect below for automated payouts, or continue with
            manual settlement until onboarding is complete.
          </>
        ) : (
          <>
            {" "}
            Admin settles outstanding balances manually; you confirm receipt
            here.
          </>
        )}
      </div>

      {requestPayout?.hasCoOwnerObligations &&
      requestPayout.reasons.includes("co_owner_outstanding") ? (
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

      <HostConnectPayoutPanel
        connectPayouts={connectPayouts}
        slug={slug}
        onRefresh={refresh}
      />

      <HostPayoutRequestStatusPanel
        requestPayout={requestPayout}
        slug={slug}
        settingsProfileTab={settingsProfileTab}
      />

      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Request payout</p>
          <p className="text-muted-foreground text-sm">
            Ask Tipmanna to review and send your pending balance.
          </p>
          {requestPayout &&
          !requestPayout.canRequest &&
          !requestPayout.pendingRequest ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Resolve the items above to enable this button.
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          disabled={
            requestingPayout ||
            isPending ||
            !requestPayout ||
            !requestPayout.canRequest ||
            !!requestPayout.pendingRequest
          }
          onClick={() => void handleRequestPayout()}
        >
          {requestingPayout
            ? "Submitting…"
            : requestPayout?.pendingRequest
              ? "Request pending"
              : "Request payout"}
        </Button>
      </div>

      {isPending ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : payoutUiState === "error" ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Could not load payout summary. Try again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
          >
            Retry
          </Button>
        </div>
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
