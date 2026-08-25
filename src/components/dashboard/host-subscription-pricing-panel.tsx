"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getHostSubscriptionMeAction,
  hostSubscriptionBillingPortalAction,
  hostSubscriptionCheckoutAction,
} from "@/actions/host";
import { useHostSession } from "@/hooks/use-host-session";
import { updateTipper } from "@/features/auth-slice";
import type { HostSubscriptionMe } from "@/lib/host-plan-capabilities";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";

type Props = {
  /** When set, only show this tier card (premium | community). */
  focusTier?: "premium" | "community";
  /** Primary CTA label override for renew flow. */
  renewLabel?: string;
};

const GROWTH_FEATURES = [
  "Everything in Free",
  "Advanced analytics",
  "Enhanced discovery opportunities",
  "Program promotion requests",
  "Custom engagement experiences",
  "Co-owner management",
  "Creator growth tools",
  "Priority feature access",
];

const COMMUNTIY_FEATURES = [
  "Everything in Premium",
  "Community TV Channel",
  "Community memberships",
  "Whitelabel community mode",
  "Program scheduling",
  "Community branding",
  "Broadcast messaging",
  "Community analytics",
  "Co-creator management",
];

export function HostSubscriptionPricingPanel({ focusTier, renewLabel }: Props) {
  const dispatch = useDispatch();
  const { isActive: hostSessionActive } = useHostSession();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<HostSubscriptionMe | null>(null);

  const refresh = useCallback(async () => {
    if (!hostSessionActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await getHostSubscriptionMeAction();
      if (!res.success || !res.data) {
        setInfo(null);
        return;
      }
      const data = res.data as HostSubscriptionMe;
      setInfo(data);
      const t = data.tier;
      const hostSubscriptionTier =
        t === "NONE" || t === "HOST_PREMIUM" || t === "HOST_COMMUNITY"
          ? t
          : undefined;
      dispatch(updateTipper({ hostSubscriptionTier }));
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [dispatch, hostSessionActive]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const checkout = async (tier: "premium" | "community") => {
    if (!hostSessionActive) {
      toast.error("Host session required.");
      return;
    }
    setBusy(tier);
    try {
      const res = await hostSubscriptionCheckoutAction(tier);
      if (!res.success) {
        toast.error(res.message ?? "Unable to start checkout.");
        return;
      }
      const data = res.data as {
        url?: string;
        upgraded?: boolean;
        redirectUrl?: string;
        message?: string;
      };
      if (data.upgraded && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error("Unexpected response from server.");
    } catch {
      toast.error("Network error.");
    } finally {
      setBusy(null);
    }
  };

  const openBillingPortal = async () => {
    if (!hostSessionActive) return;
    setBusy("portal");
    try {
      const res = await hostSubscriptionBillingPortalAction();
      if (!res.success) {
        toast.error(res.message ?? "Billing portal unavailable.");
        return;
      }
      const data = res.data as { url?: string; message?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error("Network error.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading plans…
      </div>
    );
  }

  const tier = info?.tier ?? "NONE";
  const status = info?.status ?? "none";
  const showPremium = !focusTier || focusTier === "premium";
  const showCommunity = !focusTier || focusTier === "community";

  const premiumActive =
    tier === "HOST_PREMIUM" || tier === "HOST_COMMUNITY" || status === "active";
  const communityActive = tier === "HOST_COMMUNITY" && status === "active";

  return (
    <section className="space-y-4">
      {info?.history && info.history.length > 0 && status === "lapsed" ? (
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Subscription history</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {info.history.map(row => (
              <li
                key={row.id}
                className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0"
              >
                <span>
                  {row.tier.replace(/_/g, " ")} ·{" "}
                  {new Date(row.paidAt).toLocaleDateString()}
                </span>
                <span className="font-medium">
                  {formatGbpMinor(row.amountMinor)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {showPremium ? (
          <div className="flex flex-col gap-4 rounded-lg border bg-white p-4">
            <h3 className="font-semibold">Host Growth</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Video display controls, tip layout, co-owners, and video requests.
            </p>
            <p className="text-2xl font-semibold">
              £19.99{" "}
              <span className="text-muted-foreground text-xs">per 30 days</span>
            </p>
            <ul className="w-full space-y-4 lg:hidden">
              {GROWTH_FEATURES.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm"
                >
                  <Check className="text-primary size-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-black text-white"
              disabled={
                premiumActive ||
                busy !== null ||
                (!info?.capabilities.subscribeNew &&
                  !info?.capabilities.renewSubscription)
              }
              onClick={() =>
                void checkout(
                  status === "lapsed" && tier === "HOST_PREMIUM"
                    ? "premium"
                    : "premium"
                )
              }
            >
              {busy === "premium" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : status === "lapsed" ? (
                (renewLabel ?? "Renew Premium")
              ) : (
                "Subscribe"
              )}
            </Button>
          </div>
        ) : null}

        {showCommunity ? (
          <div className="border-primary ring-primary/20 relative flex flex-col rounded-lg border p-4 ring-1">
            <span className="bg-primary absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white uppercase">
              Includes Premium
            </span>
            <h3 className="font-semibold">Host Community</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Communities, TV, sends — includes all Premium features.
            </p>
            <p className="mt-3 text-2xl font-bold">£99</p>
            <p className="text-muted-foreground text-xs">per 30 days</p>
            <ul className="w-full space-y-4 lg:hidden">
              {COMMUNTIY_FEATURES.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm"
                >
                  <Check className="text-primary size-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="mt-4 w-full bg-black text-white"
              disabled={
                communityActive ||
                busy !== null ||
                (tier === "HOST_PREMIUM" && status === "active"
                  ? false
                  : !info?.capabilities.subscribeNew &&
                    !info?.capabilities.renewSubscription)
              }
              onClick={() =>
                void checkout(
                  tier === "HOST_PREMIUM" && status === "active"
                    ? "community"
                    : "community"
                )
              }
            >
              {busy === "community" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : tier === "HOST_PREMIUM" && status === "active" ? (
                "Upgrade to Community"
              ) : status === "lapsed" ? (
                (renewLabel ?? "Renew Community")
              ) : (
                "Subscribe"
              )}
            </Button>
          </div>
        ) : null}
      </div>

      {info?.capabilities.manageBilling && info.hasStripeSubscription ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={() => void openBillingPortal()}
        >
          {busy === "portal" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Manage billing"
          )}
        </Button>
      ) : null}
    </section>
  );
}
