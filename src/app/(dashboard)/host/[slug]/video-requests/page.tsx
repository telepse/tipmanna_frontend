"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { HostVideoRequestsClient } from "@/components/dashboard/host-video-requests-client";
import { DashboardHeading } from "@/components/dashboard-heading";
import { HostSubscriptionPricingPanel } from "@/components/dashboard/host-subscription-pricing-panel";
import { HostSubscriptionUpgradeTrigger } from "@/components/dashboard/host-subscription-modal";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";

function ReadOnlyOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-60 select-none">
        {children}
      </div>
      <div
        className="bg-background/40 absolute inset-0 z-10"
        aria-hidden
      />
    </div>
  );
}

function HostVideoRequestsPageInner() {
  const { status, capabilities, isLoading } = useHostPlanCapabilities();

  const showFeatures =
    status === "active" && capabilities.usePremiumDashboardActions;
  const showLapsedFeatures =
    status === "lapsed" && capabilities.viewPremiumFeatureUi;
  const showPricing = status === "none";

  const content = <HostVideoRequestsClient />;

  return (
    <section
      className="relative min-h-screen w-full space-y-4"
      style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
    >
      <DashboardHeading
        title="Video requests"
        subtitle="Manage incoming video feature requests from tippers."
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading subscription…</p>
      ) : showPricing ? (
        <HostSubscriptionPricingPanel
          focusTier="premium"
          renewLabel="Renew Premium"
        />
      ) : showLapsedFeatures ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <p className="text-sm">
              Your Growth plan has expired. Video requests are read-only until
              you renew.
            </p>
            <HostSubscriptionUpgradeTrigger
              focusTier="premium"
              renewLabel="Renew Premium"
              label="Renew plan"
            />
          </div>
          <ReadOnlyOverlay>{content}</ReadOnlyOverlay>
        </div>
      ) : showFeatures ? (
        content
      ) : (
        <HostSubscriptionPricingPanel focusTier="premium" />
      )}
    </section>
  );
}

export default function HostVideoRequestsPage() {
  return (
    <ProtectedRoute>
      <HostVideoRequestsPageInner />
    </ProtectedRoute>
  );
}
