"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RootState } from "@/redux/store";
import {
  getHostSubscriptionMeAction,
  hostSubscriptionBillingPortalAction,
  hostSubscriptionCheckoutAction,
  hostSubscriptionRequestAction,
} from "@/actions/host";
import { useHostSession } from "@/hooks/use-host-session";
import { updateTipper } from "@/features/auth-slice";

type TierState = "NONE" | "HOST_PREMIUM" | "HOST_COMMUNITY" | string;

interface SubscriptionMe {
  tier: TierState;
  hasPremiumFeatures: boolean;
  subscriptionPeriodEnd: string | null;
  hasStripeSubscription: boolean;
  includesPremiumBecauseCommunity?: boolean;
}

export function HostSubscriptionPanel({
  eventSlug: eventSlugFromRoute,
}: {
  /** `params.slug` from `/host/[slug]` — must match signed-in host's `eventSlug`. */
  eventSlug: string | undefined;
}) {
  const dispatch = useDispatch();
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const { eventSlug, isActive: hostSessionActive } = useHostSession();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<SubscriptionMe | null>(null);

  const slugMatches =
    !!eventSlugFromRoute &&
    !!eventSlug &&
    eventSlugFromRoute.toLowerCase() === eventSlug.toLowerCase();

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
      const data = res.data as SubscriptionMe;
      setInfo(data);
      const t = data.tier;
      const hostSubscriptionTier =
        t === "NONE" || t === "HOST_PREMIUM" || t === "HOST_COMMUNITY"
          ? t
          : undefined;
      dispatch(
        updateTipper({
          hostSubscriptionTier,
        })
      );
    } catch {
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [dispatch, hostSessionActive]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sub = new URLSearchParams(window.location.search).get("subscription");
    if (sub === "success") toast.success("Subscription updated.");
    else if (sub === "cancel") toast.info("Checkout cancelled.");
    else if (sub === "upgraded") toast.success("Upgraded to Host Community.");
  }, []);

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

  if (!hostSessionActive || !slugMatches) return null;

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 rounded-lg border bg-white/80 px-4 py-3 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading subscription…
      </div>
    );
  }

  const tier = info?.tier ?? "NONE";

  const requestHostSubscriptionTier = async (
    tier: "HOST_PREMIUM" | "HOST_COMMUNITY"
  ) => {
    if (!hostSessionActive || !userId) {
      toast.error("Host session required.");
      return;
    }
    setBusy(tier);
    try {
      const res = await hostSubscriptionRequestAction(tier, userId);
      if (!res.success) {
        toast.error(res.message ?? "Unable to request subscription tier.");
        return;
      }
      toast.success("Subscription tier requested successfully.");
    } catch {
      toast.error("Network error.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-black">Host subscription</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Billed every 30 days. <strong>Host Community</strong> includes
          everything in <strong>Host Premium</strong> — one subscription only.
        </p>
      </div>

      <div className="text-sm">
        <span className="font-medium text-black">Current plan:</span>{" "}
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium">
          {tier === "NONE"
            ? "None"
            : tier === "HOST_COMMUNITY"
              ? "Host Community"
              : tier === "HOST_PREMIUM"
                ? "Host Premium"
                : tier}
        </span>
        {info?.subscriptionPeriodEnd && (
          <span className="text-muted-foreground ml-2">
            Renews{" "}
            {new Date(info.subscriptionPeriodEnd).toLocaleDateString(
              undefined,
              {
                dateStyle: "medium",
              }
            )}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col rounded-lg border p-4">
          <h3 className="font-semibold">Host Premium</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Basic premium access for hosts.
          </p>
          <p className="mt-3 text-2xl font-bold">$19.99</p>
          <p className="text-muted-foreground text-xs">per 30 days · GBP</p>
          <Button
            className="mt-4 w-full bg-black text-white"
            disabled={
              tier === "HOST_PREMIUM" ||
              tier === "HOST_COMMUNITY" ||
              busy !== null
            }
            // onClick={() => void checkout("premium")}
            onClick={() => requestHostSubscriptionTier("HOST_PREMIUM")}
          >
            {busy === "premium" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Subscribe"
            )}
          </Button>
        </div>

        <div className="border-primary ring-primary/20 relative flex flex-col rounded-lg border p-4 ring-1">
          <span className="bg-primary absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white uppercase">
            Includes Premium
          </span>
          <h3 className="font-semibold">Host Community</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            High-tier access — includes all Premium features.
          </p>
          <p className="mt-3 text-2xl font-bold">$99</p>
          <p className="text-muted-foreground text-xs">per 30 days · GBP</p>
          <Button
            className="mt-4 w-full bg-black text-white"
            disabled={
              tier === "HOST_COMMUNITY" ||
              busy !== null ||
              (tier !== "HOST_PREMIUM" && tier !== "NONE")
            }
            // onClick={() => void checkout("community")}
            onClick={() => requestHostSubscriptionTier("HOST_COMMUNITY")}
          >
            {busy === "community" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : tier === "HOST_PREMIUM" ? (
              "Upgrade to Community"
            ) : (
              "Subscribe"
            )}
          </Button>
        </div>
      </div>

      {info?.hasStripeSubscription && (
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={busy !== null}
          onClick={() => void openBillingPortal()}
        >
          {busy === "portal" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Manage subscription"
          )}
        </Button>
      )}
    </section>
  );
}
