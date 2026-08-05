"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DashboardHeading } from "@/components/dashboard-heading";
import { HostVideoCoOwnersClient } from "@/components/dashboard/host-video-co-owners-client";
import { HostVideoRequestsClient } from "@/components/dashboard/host-video-requests-client";
import { HostSubscriptionPricingPanel } from "@/components/dashboard/host-subscription-pricing-panel";
import { HostChannelManageClient } from "@/components/dashboard/host-channel-manage-client";
import { VideoAnalyticsPanel } from "@/components/dashboard/video-analytics-panel";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";

type PremiumTab =
  | "channel_manage"
  | "video_requests"
  | "video_coowners"
  | "advanced_video_analytics";

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

export const HostPremiumClient = () => {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [tabType, setTabType] = useState<PremiumTab>("video_requests");
  const { status, capabilities, isLoading } = useHostPlanCapabilities();

  useEffect(() => {
    if (tabFromUrl === "advanced_video_analytics") {
      setTabType("advanced_video_analytics");
    }
  }, [tabFromUrl]);

  const showFeatures =
    status === "active" && capabilities.usePremiumDashboardActions;
  const showPricing =
    status === "none" ||
    (status === "lapsed" && !capabilities.usePremiumDashboardActions);

  const featureTabs = (
    <Tabs
      value={tabType}
      onValueChange={val => setTabType(val as PremiumTab)}
      className="section px-0"
    >
      <TabsList className="flex h-14! w-full flex-wrap gap-1">
        <TabsTrigger
          value="video_requests"
          className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
        >
          Video Requests
        </TabsTrigger>
        <TabsTrigger
          value="video_coowners"
          className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
        >
          Video Co-owners
        </TabsTrigger>
        <TabsTrigger
          value="advanced_video_analytics"
          className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
        >
          Advanced video analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="channel_manage"
        className="mt-6 space-y-6"
      >
        <p className="text-muted-foreground text-sm">
          Manage the default channel for each event room - toggle show view
          count, show amount raised, and customize tip layout.
        </p>
        <HostChannelManageClient />
      </TabsContent>

      <TabsContent
        value="video_requests"
        className="mt-6 space-y-6"
      >
        <HostVideoRequestsClient />
      </TabsContent>

      <TabsContent
        value="video_coowners"
        className="mt-6 space-y-6"
      >
        <HostVideoCoOwnersClient />
      </TabsContent>

      <TabsContent
        value="advanced_video_analytics"
        className="mt-6 space-y-6"
      >
        <VideoAnalyticsPanel variant="advanced" />
      </TabsContent>
    </Tabs>
  );

  return (
    <section className="flex flex-col gap-6">
      <DashboardHeading
        title="Host Premium"
        subtitle="Manage your premium plan and features."
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading subscription…</p>
      ) : showPricing ? (
        <div className="space-y-6">
          <HostSubscriptionPricingPanel
            focusTier="premium"
            renewLabel="Renew Premium"
          />
          {status === "lapsed" && capabilities.viewPremiumFeatureUi ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                Your previous Premium features are shown below for reference.
                Renew to take action again.
              </p>
              <ReadOnlyOverlay>{featureTabs}</ReadOnlyOverlay>
            </div>
          ) : null}
        </div>
      ) : showFeatures ? (
        featureTabs
      ) : (
        <HostSubscriptionPricingPanel focusTier="premium" />
      )}
    </section>
  );
};
