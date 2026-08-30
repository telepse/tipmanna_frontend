"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import { useHostEvents } from "@/hooks/useHostEvents";
import { useHostPayoutSummary } from "@/hooks/useHostPayoutSummary";
import { useHostStats } from "@/hooks/useHostStats";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { useHostSession } from "@/hooks/use-host-session";
import { useHostAuthOptional } from "@/contexts/host-auth-context";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import { hostSubscriptionBillingPortalAction } from "@/actions/host";

import { HostBanner } from "../host/host-banner";
import { HostStats } from "../host/host-stats";
import { HostSubscriptionUpgradeTrigger } from "@/components/dashboard/host-subscription-modal";
import { HostSubscriptionPricingPanel } from "@/components/dashboard/host-subscription-pricing-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function planLabel(tier?: string | null, status?: string) {
  if (tier === "HOST_COMMUNITY" && status === "active") return "Host Community";
  if (tier === "HOST_PREMIUM" && status === "active") return "Host Growth";
  if (status === "lapsed") return "Plan expired";
  return "Free plan";
}

function formatPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const HostProfileClient = () => {
  const { events } = useHostEvents();
  const { stats } = useHostStats();
  const { summary } = useHostPayoutSummary();
  const { isLoading: hostSessionLoading } = useHostSession();
  const dashboardAuth = useHostAuthOptional();
  const { handleAuthRequiredError, HostAuthModal } = dashboardAuth ?? {
    handleAuthRequiredError: () => false,
    HostAuthModal: null,
  };
  const {
    info,
    status,
    capabilities,
    isLoading: planLoading,
  } = useHostPlanCapabilities();
  const { SubscriptionPromptModal } = useHostSubscriptionPrompt();
  const [billingBusy, setBillingBusy] = useState(false);

  const loading = hostSessionLoading || planLoading;
  const periodEndLabel = formatPeriodEnd(info?.subscriptionPeriodEnd);
  const showCompactPricing =
    !loading && (status === "none" || status === "lapsed");

  const openBillingPortal = () => {
    setBillingBusy(true);
    void (async () => {
      try {
        const res = await hostSubscriptionBillingPortalAction();
        if (!res.success) {
          if (
            handleAuthRequiredError(res, () => {
              void openBillingPortal();
            })
          ) {
            return;
          }
          toast.error(res.message ?? "Billing portal unavailable.");
          return;
        }
        const url = (res.data as { url?: string })?.url;
        if (url) window.location.href = url;
        else toast.error("Billing portal unavailable.");
      } catch {
        toast.error("Network error.");
      } finally {
        setBillingBusy(false);
      }
    })();
  };

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 overflow-x-hidden">
      {HostAuthModal}
      {SubscriptionPromptModal}

      <div className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Current plan</span>
              {loading ? (
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              ) : (
                <Badge variant={status === "active" ? "default" : "secondary"}>
                  {planLabel(info?.tier, status)}
                </Badge>
              )}
            </div>
            {!loading && periodEndLabel && status === "active" ? (
              <p className="text-muted-foreground text-sm">
                Current period ends {periodEndLabel}
              </p>
            ) : null}
            {!loading && status === "lapsed" ? (
              <p className="text-sm text-amber-800">
                Your paid plan has expired. Renew to restore Growth and
                Community features.
              </p>
            ) : null}
          </div>

          {!loading ? (
            <div className="flex flex-wrap gap-2">
              {status !== "active" || info?.tier === "NONE" ? (
                <HostSubscriptionUpgradeTrigger
                  focusTier={
                    info?.tier === "HOST_COMMUNITY" ? "community" : "premium"
                  }
                  renewLabel={status === "lapsed" ? "Renew plan" : undefined}
                  label={status === "lapsed" ? "Renew plan" : "Subscribe"}
                />
              ) : info?.tier === "HOST_PREMIUM" ? (
                <HostSubscriptionUpgradeTrigger
                  focusTier="community"
                  label="Upgrade to Community"
                  variant="outline"
                />
              ) : null}
              {capabilities.manageBilling && info?.hasStripeSubscription ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={billingBusy}
                  onClick={() => void openBillingPortal()}
                >
                  {billingBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Manage billing"
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {showCompactPricing ? (
          <HostSubscriptionPricingPanel
            focusTier={
              info?.tier === "HOST_COMMUNITY" ? "community" : "premium"
            }
            renewLabel={status === "lapsed" ? "Renew plan" : undefined}
          />
        ) : null}
      </div>

      <HostBanner />

      <HostStats
        events={events}
        stats={stats}
        payoutSummary={summary}
      />
    </section>
  );
};
