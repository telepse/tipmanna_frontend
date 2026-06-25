"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RootState } from "@/redux/store";
import { updateTipper } from "@/features/auth-slice";
import type { HostSubscriptionMe } from "@/lib/host-plan-capabilities";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";

type Props = {
  /** When set, only show this tier card (premium | community). */
  focusTier?: "premium" | "community";
  /** Primary CTA label override for renew flow. */
  renewLabel?: string;
};

export function HostSubscriptionPricingPanel({
  focusTier,
  renewLabel,
}: Props) {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<HostSubscriptionMe | null>(null);

  const refresh = useCallback(async () => {
    const token = authToken;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      if (!res.ok) {
        setInfo(null);
        return;
      }
      const data = (await res.json()) as HostSubscriptionMe;
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
  }, [authToken, dispatch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const checkout = async (tier: "premium" | "community") => {
    const token = authToken;
    if (!token) {
      toast.error("Please sign in again.");
      return;
    }
    setBusy(tier);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tier }),
        }
      );
      const data = (await res.json()) as {
        url?: string;
        upgraded?: boolean;
        redirectUrl?: string;
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message ?? "Unable to start checkout.");
        return;
      }
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
    const token = authToken;
    if (!token) return;
    setBusy("portal");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/billing-portal`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok) {
        toast.error(data.message ?? "Billing portal unavailable.");
        return;
      }
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

      <div className="grid gap-3 md:grid-cols-2">
        {showPremium ? (
          <div className="flex flex-col rounded-lg border p-4">
            <h3 className="font-semibold">Host Premium</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Video display controls, tip layout, co-owners, and video
              requests.
            </p>
            <p className="mt-3 text-2xl font-bold">£19.99</p>
            <p className="text-muted-foreground text-xs">per 30 days</p>
            <Button
              className="mt-4 w-full bg-black text-white"
              disabled={
                premiumActive || busy !== null || !info?.capabilities.subscribeNew && !info?.capabilities.renewSubscription
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
                renewLabel ?? "Renew Premium"
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
                renewLabel ?? "Renew Community"
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
