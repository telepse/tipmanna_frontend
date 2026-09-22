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

import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";

import { formatGbpMinor } from "@/lib/host-plan-capabilities";

import { isSubscriptionLapsedError } from "@/lib/host-subscription-errors";

type HostSubscriptionInfo = {
  tier?: string | null;
  subscriptionPeriodEnd?: string | null;
  hasStripeSubscription?: boolean;
  history?: Array<{
    id: string;
    tier: string;
    paidAt: string;
    amountMinor: number;
  }>;
  capabilities?: {
    manageBilling?: boolean;
    subscribeNew?: boolean;
    renewSubscription?: boolean;
  };
};

type HostSubscriptionCapabilities = {
  subscribeNew: boolean;
  renewSubscription: boolean;
  manageBilling: boolean;
};

type HostSubscriptionState = {
  info?: HostSubscriptionInfo | null;
  status: string;
  capabilities: HostSubscriptionCapabilities;
  isLoading?: boolean;
  fetchError?: {
    requiresHostSession?: boolean;
    message?: string;
    validationBody?: unknown;
  } | null;
  refresh?: () => Promise<unknown> | unknown;
};

type Props = {
  /**
   * When set, only show this tier card.
   */
  focusTier?: "premium" | "community";

  /**
   * Primary CTA label override for renew flow.
   */
  renewLabel?: string;

  /**
   * When true, subscription errors show inline.
   */
  embeddedInModal?: boolean;

  /**
   * When true, the parent component supplies the already-loaded
   * subscription state. This prevents this panel from fetching
   * the host plan a second time.
   */
  embeddedInHostProfile?: boolean;

  /**
   * Existing subscription state from the parent.
   *
   * Pass the result of useHostPlanCapabilities() when
   * embeddedInHostProfile is true.
   */
  subscription?: HostSubscriptionState;
};

const GROWTH_FEATURES = [
  "Creator growth tools",
  "Event room access control",
  "Advanced analytics",
  "Enhanced discovery opportunities",
  "Content promotion requests",
  "Custom engagement experiences",
  "Co-owner management",
  "Everything in Free",
];

const COMMUNITY_FEATURES = [
  "Community TV system",
  "Community memberships",
  "Whitelabel community mode",
  "TV program scheduling",
  "Community branding",
  "Broadcast messaging",
  "Community analytics",
  "Co-creator management",
  "Everything in Premium",
];

type PricingPanelContentProps = Props & {
  subscriptionState: HostSubscriptionState;
};

function HostSubscriptionPricingPanelContent({
  focusTier,
  renewLabel,
  embeddedInModal = false,
  embeddedInHostProfile = false,
  subscriptionState,
}: PricingPanelContentProps) {
  const {
    info,
    status,
    capabilities,
    isLoading: subLoading = false,
    fetchError = null,
    refresh: refreshSubscription,
  } = subscriptionState;

  const { isActive: hostSessionActive, isLoading: hostSessionLoading } =
    useHostSession();

  const dashboardAuth = useHostAuthOptional();

  const fallbackAuth = useHostCapabilityWithAuth({
    hostRequiredNotice: true,
    enabled: !dashboardAuth,
  });

  const { handleAuthRequiredError, requestHostAuth, HostAuthModal } =
    dashboardAuth ?? fallbackAuth;

  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({
      focusTier: focusTier ?? "premium",
    });

  const [pricingLoading, setPricingLoading] = useState(true);

  const [busy, setBusy] = useState<string | null>(null);

  const [pricing, setPricing] = useState<PublicPlanPricing | null>(null);

  const [inlinePlanError, setInlinePlanError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getPlanPricingAction().then(priceRes => {
      if (cancelled) return;

      if (priceRes.success && priceRes.data) {
        setPricing(priceRes.data as PublicPlanPricing);
      }

      setPricingLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fetchError?.requiresHostSession || hostSessionLoading) {
      return;
    }

    if (hostSessionActive) {
      if (refreshSubscription) {
        void refreshSubscription();
      }

      return;
    }

    handleAuthRequiredError(
      {
        message: fetchError.message,
        validationBody: fetchError.validationBody,
      },
      () => {
        if (refreshSubscription) {
          void refreshSubscription();
        }
      }
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

  const handlePlanActionError = (
    res: {
      success?: boolean;
      message?: string | null;
      validationBody?: unknown;
    },
    tier: "premium" | "community"
  ) => {
    setInlinePlanError(null);

    if (
      handleSubscriptionActionError(res, {
        focusTier: tier,
        toastFallback: !embeddedInModal,
      })
    ) {
      if (embeddedInModal) {
        setInlinePlanError(
          isSubscriptionLapsedError(res.validationBody)
            ? "Your subscription has lapsed. Choose a plan below to renew."
            : "An active host plan is required. Choose a plan below."
        );
      }

      return true;
    }

    return false;
  };

  const checkout = async (
    checkoutTier: "premium" | "community",
    options?: {
      upgradeAtPeriodEnd?: boolean;
    }
  ) => {
    ensureHostSession(() => {
      void (async () => {
        setBusy(checkoutTier);
        setInlinePlanError(null);

        try {
          const res = await hostSubscriptionCheckoutAction(
            checkoutTier,
            options
          );

          if (!res.success) {
            if (
              handleAuthRequiredError(
                res,
                () => void checkout(checkoutTier, options)
              )
            ) {
              return;
            }

            if (handlePlanActionError(res, checkoutTier)) {
              return;
            }

            toast.error(res.message ?? "Unable to start checkout.");

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

          const data = res.data as {
            url?: string;
            message?: string;
          };

          if (data.url) {
            window.location.href = data.url;
          }
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

  const showBothPlansInModal = embeddedInModal;

  const showPremium =
    showBothPlansInModal || !focusTier || focusTier === "premium";

  const showCommunity =
    showBothPlansInModal || !focusTier || focusTier === "community";

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

  const showPremiumDiscount = Boolean(
    pricing?.discountActive && premiumSale < premiumList
  );

  const showCommunityDiscount = Boolean(
    pricing?.discountActive && communitySale < communityList
  );

  return (
    <section className="space-y-4">
      {!dashboardAuth ? HostAuthModal : null}

      {!embeddedInModal ? SubscriptionPromptModal : null}

      {inlinePlanError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {inlinePlanError}
        </div>
      ) : null}

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
              Playlist, access control, custom tip layout, co-owners, and promo
              requests.
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

            <ul className="w-full space-y-3">
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

            <ul className="w-full space-y-3">
              {COMMUNITY_FEATURES.map((feature, index) => (
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
              onClick={() => void checkout("community")}
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
                  void checkout("community", {
                    upgradeAtPeriodEnd: true,
                  })
                }
              >
                Upgrade at period end
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {info?.capabilities?.manageBilling && info.hasStripeSubscription ? (
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

/**
 * Normal usage:
 *
 * This component owns useHostPlanCapabilities().
 */
export function HostSubscriptionPricingPanel(props: Props) {
  const { embeddedInHostProfile = false, subscription } = props;

  /**
   * When embedded in HostProfileClient, the parent
   * supplies the already-loaded subscription state.
   *
   * This prevents a second useHostPlanCapabilities()
   * request from being created by the pricing panel.
   */
  if (embeddedInHostProfile && subscription) {
    return (
      <HostSubscriptionPricingPanelContent
        {...props}
        subscriptionState={subscription}
      />
    );
  }

  return <HostSubscriptionPricingPanelWithOwnSubscription {...props} />;
}

/**
 * Isolated component so useHostPlanCapabilities()
 * is always called unconditionally within this
 * component, while the parent-embedded path above
 * can completely avoid it.
 */
function HostSubscriptionPricingPanelWithOwnSubscription(props: Props) {
  const { info, status, capabilities, isLoading, fetchError, refresh } =
    useHostPlanCapabilities();

  return (
    <HostSubscriptionPricingPanelContent
      {...props}
      subscriptionState={{
        info,
        status,
        capabilities,
        isLoading,
        fetchError,
        refresh,
      }}
    />
  );
}
