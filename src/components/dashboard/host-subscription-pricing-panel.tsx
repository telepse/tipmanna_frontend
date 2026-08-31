"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  hostSubscriptionBillingPortalAction,
  hostSubscriptionCheckoutAction,
} from "@/actions/host";
import {
  getPlanPricingAction,
  type PublicPlanPricing,
} from "@/actions/plan-pricing";
import { useHostSession } from "@/hooks/use-host-session";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { useHostAuthOptional } from "@/contexts/host-auth-context";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";
import {
  isSubscriptionLapsedError,
  isSubscriptionRequiredError,
} from "@/lib/host-subscription-errors";

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
  const { isActive: hostSessionActive, isLoading: hostSessionLoading } =
    useHostSession();
  const {
    info,
    status,
    capabilities,
    isLoading: subLoading,
    fetchError,
    refresh: refreshSubscription,
  } = useHostPlanCapabilities();
  const dashboardAuth = useHostAuthOptional();
  const fallbackAuth = useHostCapabilityWithAuth({
    hostRequiredNotice: true,
    enabled: !dashboardAuth,
  });
  const { handleAuthRequiredError, requestHostAuth, HostAuthModal } =
    dashboardAuth ?? fallbackAuth;

  const [pricingLoading, setPricingLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PublicPlanPricing | null>(null);

  useEffect(() => {
    void getPlanPricingAction().then(priceRes => {
      if (priceRes.success && priceRes.data) {
        setPricing(priceRes.data as PublicPlanPricing);
      }
      setPricingLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!fetchError?.requiresHostSession || hostSessionLoading) return;
    if (hostSessionActive) {
      void refreshSubscription();
      return;
    }
    handleAuthRequiredError(
      {
        message: fetchError.message,
        validationBody: fetchError.validationBody,
      },
      () => void refreshSubscription()
    );
  }, [
    fetchError,
    handleAuthRequiredError,
    hostSessionActive,
    hostSessionLoading,
    refreshSubscription,
  ]);

  const ensureHostSession = useCallback(
    (onReady: () => void) => {
      if (hostSessionActive && !fetchError?.requiresHostSession) {
        onReady();
        return;
      }
      requestHostAuth(onReady);
    },
    [fetchError?.requiresHostSession, hostSessionActive, requestHostAuth]
  );

  const checkout = async (
    tier: "premium" | "community",
    options?: { upgradeAtPeriodEnd?: boolean }
  ) => {
    ensureHostSession(() => {
      void (async () => {
        setBusy(tier);
        try {
          const res = await hostSubscriptionCheckoutAction(tier, options);
          if (!res.success) {
            if (
              handleAuthRequiredError(res, () => void checkout(tier, options))
            ) {
              return;
            }
            if (isSubscriptionLapsedError(res.validationBody)) {
              toast.error("Your subscription has lapsed. Renew to continue.");
            } else if (isSubscriptionRequiredError(res.validationBody)) {
              toast.error("An active host plan is required.");
            } else {
              toast.error(res.message ?? "Unable to start checkout.");
            }
            return;
          }
          const data = res.data as {
            url?: string;
            upgraded?: boolean;
            scheduled?: boolean;
            redirectUrl?: string;
            message?: string;
          };
          if ((data.upgraded || data.scheduled) && data.redirectUrl) {
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
      })();
    });
  };

  const openBillingPortal = async () => {
    ensureHostSession(() => {
      void (async () => {
        setBusy("portal");
        try {
          const res = await hostSubscriptionBillingPortalAction();
          if (!res.success) {
            if (handleAuthRequiredError(res, () => void openBillingPortal())) {
              return;
            }
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
      })();
    });
  };

  const loading = subLoading || pricingLoading;

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading plans…
      </div>
    );
  }

  const tier = info?.tier ?? "NONE";
  const showPremium = !focusTier || focusTier === "premium";
  const showCommunity = !focusTier || focusTier === "community";

  const premiumActive =
    status === "active" &&
    (tier === "HOST_PREMIUM" || tier === "HOST_COMMUNITY");
  const communityActive = status === "active" && tier === "HOST_COMMUNITY";

  const canSubscribeOrRenew =
    capabilities.subscribeNew || capabilities.renewSubscription;
  const needsHostReauth =
    !hostSessionActive || fetchError?.requiresHostSession === true;
  const subscribeAllowed = canSubscribeOrRenew || needsHostReauth;

  const premiumList = pricing?.premium.listMinor ?? 2999;
  const premiumSale = pricing?.premium.saleMinor ?? premiumList;
  const communityList = pricing?.community.listMinor ?? 9999;
  const communitySale = pricing?.community.saleMinor ?? communityList;
  const showPremiumDiscount =
    pricing?.discountActive && premiumSale < premiumList;
  const showCommunityDiscount =
    pricing?.discountActive && communitySale < communityList;

  return (
    <section className="space-y-4">
      {!dashboardAuth ? HostAuthModal : null}

      {needsHostReauth ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Host sign-in is required to subscribe or manage billing.
        </div>
      ) : null}

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
              {showPremiumDiscount ? (
                <>
                  <span className="text-muted-foreground mr-2 text-base line-through">
                    {formatGbpMinor(premiumList)}
                  </span>
                  {formatGbpMinor(premiumSale)}
                </>
              ) : (
                formatGbpMinor(premiumList)
              )}{" "}
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
              disabled={premiumActive || busy !== null || !subscribeAllowed}
              onClick={() => void checkout("premium")}
            >
              {busy === "premium" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : needsHostReauth ? (
                "Sign in to subscribe"
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
            <p className="mt-3 text-2xl font-bold">
              {showCommunityDiscount ? (
                <>
                  <span className="text-muted-foreground mr-2 text-lg line-through">
                    {formatGbpMinor(communityList)}
                  </span>
                  {formatGbpMinor(communitySale)}
                </>
              ) : (
                formatGbpMinor(communityList)
              )}
            </p>
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
                  : !subscribeAllowed)
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
              ) : needsHostReauth ? (
                "Sign in to subscribe"
              ) : tier === "HOST_PREMIUM" && status === "active" ? (
                "Upgrade to Community"
              ) : status === "lapsed" ? (
                (renewLabel ?? "Renew Community")
              ) : (
                "Subscribe"
              )}
            </Button>
            {tier === "HOST_PREMIUM" &&
            status === "active" &&
            info?.hasStripeSubscription ? (
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                disabled={busy !== null}
                onClick={() =>
                  void checkout("community", { upgradeAtPeriodEnd: true })
                }
              >
                Upgrade at period end
              </Button>
            ) : null}
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
