"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Crown, Loader2 } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { PayoutSummaryCard } from "../host/payout-summary-card";
import { HostPayoutRequestStatusPanel } from "@/components/dashboard/host-payout-request-status";
import { HostConnectPayoutPanel } from "@/components/dashboard/host-connect-payout-panel";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { SettingsClient } from "./settings-client";

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
  const { summary, requestPayout, connectPayouts, refresh } =
    useHostPayoutSummary();
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

  const [tabType, setTabType] = useState<
    "account_info" | "payout" | "subscriptions" | "account_settings"
  >("account_info");

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

  const user = useSelector((state: RootState) => state.auth.user);
  const hostSession = useHostSession();

  const params = useParams();

  if (!user) return null;

  const eventSlug =
    typeof params?.slug === "string"
      ? params.slug
      : (hostSession.eventSlug ?? ("eventSlug" in user ? user.eventSlug : ""));

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 overflow-x-hidden">
      {HostAuthModal}
      {SubscriptionPromptModal}

      <div className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Crown className="text-primary size-4" />
              {loading ? (
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              ) : (
                <Badge variant={status === "active" ? "default" : "secondary"}>
                  {planLabel(info?.tier, status)}
                </Badge>
              )}
            </div>
            {!loading && periodEndLabel && status === "active" ? (
              <div className="flex flex-col gap-2">
                <h5 className=""></h5>

                <p className="text-muted-foreground text-sm">
                  Renews on {periodEndLabel}
                </p>
              </div>
            ) : null}
            {!loading && status === "lapsed" ? (
              <p className="text-sm text-amber-800">
                Your paid plan has expired. Renew to restore Growth and
                Community features.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <HostBanner />

      <Tabs
        value={tabType}
        onValueChange={val =>
          setTabType(
            val as
              | "account_info"
              | "payout"
              | "subscriptions"
              | "account_settings"
          )
        }
        className="flex flex-col gap-4"
      >
        <TabsList className="scrollbar-hide flex h-14! w-full max-w-full touch-pan-x justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain sm:justify-center">
          <TabsTrigger
            value="account_info"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
          >
            Account info
          </TabsTrigger>
          <TabsTrigger
            value="payout"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
          >
            Payouts
          </TabsTrigger>
          <TabsTrigger
            value="subscriptions"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
          >
            Subscriptions
          </TabsTrigger>
          <TabsTrigger
            value="account_settings"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold data-[state=active]:border-b-2"
          >
            Account settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account_info">
          <HostStats
            events={events}
            stats={stats}
            payoutSummary={summary}
          />
        </TabsContent>

        <TabsContent value="payout">
          {/* Payout summary */}
          <div className="bg-card min-w-0 space-y-6 overflow-hidden rounded-xl border p-4 shadow-sm sm:p-6">
            <h2 className="text-2xl font-semibold">Payout summary</h2>

            <div className="space-y-6">
              <PayoutSummaryCard
                label="Pending Payouts"
                value={(summary?.pendingMinor ?? 0) / 100}
                bgColor="#FFF3E7"
                txtColor="#CB6305"
                isMoney
                subLabel={`Event tips: ${formatGbpMinor(
                  summary?.pendingByBranch.eventTipsMinor ?? 0
                )} · Community: ${formatGbpMinor(
                  summary?.pendingByBranch.communitySubscriptionMinor ?? 0
                )}`}
              />

              <PayoutSummaryCard
                label="Total Received"
                value={(summary?.receivedMinor ?? 0) / 100}
                bgColor="#E5FFE3"
                txtColor="#04802E"
                isMoney
                subLabel={`Event tips: ${formatGbpMinor(
                  summary?.receivedByBranch.eventTipsMinor ?? 0
                )} · Community: ${formatGbpMinor(
                  summary?.receivedByBranch.communitySubscriptionMinor ?? 0
                )}`}
              />

              <HostConnectPayoutPanel
                connectPayouts={connectPayouts}
                slug={eventSlug as string}
                onRefresh={refresh}
              />

              <HostPayoutRequestStatusPanel
                requestPayout={requestPayout}
                slug={eventSlug as string}
                settingsProfileTab={
                  requestPayout?.profileAccountType === "ORGANIZATION"
                    ? "organisation_profile"
                    : "individual_profile"
                }
                compact
              />

              <div className="flex flex-col gap-4">
                <Link href={`/host/${eventSlug}/revenue`}>
                  <Button
                    size="lg"
                    className="w-full"
                  >
                    Revenue & payouts →
                  </Button>
                </Link>

                <Link href={`/host/${eventSlug}/reports`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    Reports & insights →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <div className="bg-card space-y-4 rounded-xl border p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Crown className="text-primary size-4" />
                  {loading ? (
                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                  ) : (
                    <Badge
                      variant={status === "active" ? "default" : "secondary"}
                    >
                      {planLabel(info?.tier, status)}
                    </Badge>
                  )}
                </div>
                {!loading && periodEndLabel && status === "active" ? (
                  <div className="flex flex-col gap-2">
                    <h5 className=""></h5>

                    <p className="text-muted-foreground text-sm">
                      Renews on {periodEndLabel}
                    </p>
                  </div>
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
                        info?.tier === "HOST_COMMUNITY"
                          ? "community"
                          : "premium"
                      }
                      renewLabel={
                        status === "lapsed" ? "Renew plan" : undefined
                      }
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
        </TabsContent>

        <TabsContent value="account_settings">
          <SettingsClient />
        </TabsContent>
      </Tabs>
    </section>
  );
};
