"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useParams } from "next/navigation";

import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  acceptPayoutSettlementAction,
  getHostPayoutSummaryAction,
  getMyLegacyCommunityPayoutsAction,
  type LegacyCommunityPayoutRow,
} from "@/actions/host-payouts";
import type { RootState } from "@/redux/store";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

const communityFeatureOn =
  process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

/** Mirrors backend `USE_LEGACY_COMMUNITY_PAYOUT` (default off). */
const useLegacyCommunityPayout =
  process.env.NEXT_PUBLIC_USE_LEGACY_COMMUNITY_PAYOUT === "true";

type PendingSettlement = {
  id: string;
  label: string;
  amountMinor: number;
  receiptUrl?: string | null;
};

export function HostCommunityPayoutsClient() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [items, setItems] = useState<LegacyCommunityPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutSummary, setPayoutSummary] = useState<{
    host?: Array<{
      settlements?: Array<{
        id: string;
        status: string;
        amountMinor: number;
        receiptUrl?: string | null;
      }>;
    }>;
    communities?: Array<{
      communityName?: string;
      settlements?: Array<{
        id: string;
        status: string;
        amountMinor: number;
        receiptUrl?: string | null;
      }>;
    }>;
  } | null>(null);

  const pendingSettlements = useMemo((): PendingSettlement[] => {
    if (!payoutSummary) return [];
    const rows: PendingSettlement[] = [];
    for (const h of payoutSummary.host ?? []) {
      for (const s of h.settlements ?? []) {
        if (s.status === "pending_host_ack") {
          rows.push({
            id: s.id,
            label: "Host payout",
            amountMinor: s.amountMinor,
            receiptUrl: s.receiptUrl,
          });
        }
      }
    }
    for (const c of payoutSummary.communities ?? []) {
      for (const s of c.settlements ?? []) {
        if (s.status === "pending_host_ack") {
          rows.push({
            id: s.id,
            label: c.communityName ?? "Community payout",
            amountMinor: s.amountMinor,
            receiptUrl: s.receiptUrl,
          });
        }
      }
    }
    return rows;
  }, [payoutSummary]);

  const loadPayoutSummary = useCallback(async () => {
    const res = await getHostPayoutSummaryAction(authToken);
    if (res.success && res.data) {
      setPayoutSummary(
        res.data as NonNullable<typeof payoutSummary>
      );
    }
  }, [authToken]);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    if (useLegacyCommunityPayout) {
      const [legacyRes] = await Promise.all([
        getMyLegacyCommunityPayoutsAction(authToken),
        loadPayoutSummary(),
      ]);
      if (!legacyRes.success || !legacyRes.data) {
        toast.error(legacyRes.message ?? "Could not load community payouts");
        setItems([]);
      } else {
        setItems(legacyRes.data.items ?? []);
      }
    } else {
      setItems([]);
      await loadPayoutSummary();
    }
    setLoading(false);
  }, [authToken, loadPayoutSummary, userId]);

  useEffect(() => {
    if (!communityFeatureOn) return;
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId || !communityFeatureOn) return;
    const hostChannel = subscribeChannel(`community-host-${userId}`);
    const onPayoutSettled = () => {
      toast.info("Community payout updated");
      void load();
    };
    if (hostChannel) hostChannel.bind("community-payout-settled", onPayoutSettled);
    return () => {
      if (hostChannel)
        hostChannel.unbind("community-payout-settled", onPayoutSettled);
      unsubscribeChannel(`community-host-${userId}`);
    };
  }, [load, userId]);

  if (!communityFeatureOn) {
    return (
      <p className="text-muted-foreground text-sm">
        Community features are disabled.
      </p>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <DashboardHeading
        title="Community payouts"
        subtitle="Track subscription earnings from your communities and confirm payouts sent by Tipmanna."
      />

      {slug ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          For full revenue across event tips and community subscriptions, use{" "}
          <a
            href={`/host/${slug}/revenue`}
            className="font-medium underline"
          >
            Revenue &amp; Payouts
          </a>
          .
        </div>
      ) : null}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <p className="font-medium">Subscription earnings</p>
        <p className="mt-1">
          Amounts owed grow when tippers subscribe to your communities. Tipmanna
          admin settles outstanding balances and you can confirm receipt below
          when a payout is ready.
        </p>
      </div>

      {pendingSettlements.length > 0 ? (
        <div className="bg-card space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">
            Payouts awaiting your confirmation
          </p>
          {pendingSettlements.map(row => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 first:border-t-0 first:pt-0"
            >
              <div>
                <p className="text-sm">{row.label}</p>
                <p className="text-lg font-semibold">
                  £{(row.amountMinor / 100).toFixed(2)}
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

      {useLegacyCommunityPayout ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Earnings by community</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No payout rows yet. They appear when tippers pay for a community
              subscription.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 font-medium">Community</th>
                    <th className="p-3 font-medium">Owed</th>
                    <th className="p-3 font-medium">Paid</th>
                    <th className="p-3 font-medium">Outstanding</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => (
                    <tr
                      key={row.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-3">
                        <span className="font-medium">{row.communityName}</span>
                      </td>
                      <td className="p-3">£{row.amountOwed}</td>
                      <td className="p-3">£{row.amountPaid}</td>
                      <td className="p-3">£{row.outstanding}</td>
                      <td className="p-3">
                        <Badge variant="secondary">{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Community earnings and obligations are on{" "}
          {slug ? (
            <a
              href={`/host/${slug}/revenue`}
              className="text-primary font-medium underline"
            >
              Revenue &amp; Payouts
            </a>
          ) : (
            "Revenue & Payouts"
          )}
          .
        </p>
      )}
    </section>
  );
}
