"use client";

import { useHostEvents } from "@/hooks/useHostEvents";
import { useHostPayoutSummary } from "@/hooks/useHostPayoutSummary";
import { useHostStats } from "@/hooks/useHostStats";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";

import { HostBanner } from "../host/host-banner";
import { HostStats } from "../host/host-stats";
import { HostSubscriptionUpgradeTrigger } from "@/components/dashboard/host-subscription-modal";
import { Badge } from "@/components/ui/badge";

function planLabel(tier?: string | null, status?: string) {
  if (tier === "HOST_COMMUNITY" && status === "active") return "Host Community";
  if (tier === "HOST_PREMIUM" && status === "active") return "Host Growth";
  if (status === "lapsed") return "Plan expired";
  return "Free plan";
}

export const HostProfileClient = () => {
  const { events } = useHostEvents();
  const { stats } = useHostStats();
  const { summary } = useHostPayoutSummary();
  const { info, status } = useHostPlanCapabilities();

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 overflow-x-hidden">
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current plan</span>
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {planLabel(info?.tier, status)}
          </Badge>
        </div>
        {status !== "active" || info?.tier === "NONE" ? (
          <HostSubscriptionUpgradeTrigger
            focusTier={
              info?.tier === "HOST_COMMUNITY" ? "community" : "premium"
            }
            renewLabel={status === "lapsed" ? "Renew plan" : undefined}
            label={status === "lapsed" ? "Renew plan" : "Upgrade plan"}
          />
        ) : info?.tier === "HOST_PREMIUM" ? (
          <HostSubscriptionUpgradeTrigger
            focusTier="community"
            label="Upgrade to Community"
            variant="outline"
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
