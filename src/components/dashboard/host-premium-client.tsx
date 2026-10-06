"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DashboardHeading } from "@/components/dashboard-heading";
import { getHostEventsAction } from "@/actions/events";
import { HostVideoCoOwnersClient } from "@/components/dashboard/host-video-co-owners-client";
import { HostVideoRequestsClient } from "@/components/dashboard/host-video-requests-client";
import { HostPlaylistsClient } from "@/components/dashboard/host-playlists-client";
import { HostSubscriptionPricingPanel } from "@/components/dashboard/host-subscription-pricing-panel";
import { HostSubscriptionUpgradeTrigger } from "@/components/dashboard/host-subscription-modal";
import { EventRoomAccessControl } from "@/components/dashboard/event-room-access-control";
import { HostChannelManageClient } from "@/components/dashboard/host-channel-manage-client";
import { VideoAnalyticsPanel } from "@/components/dashboard/video-analytics-panel";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import { parseHostPremiumTab } from "@/lib/host-dashboard-shortcuts";
import { parseHostEventsPickList } from "@/lib/parse-host-events";

type PremiumTab =
  | "channel_manage"
  | "video_requests"
  | "video_coowners"
  | "advanced_video_analytics"
  | "playlist"
  | "event_room_access_control";

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
  const hostId = useSelector((s: RootState) => s.auth.user?.id ?? "");
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [tabType, setTabType] = useState<PremiumTab>("video_requests");
  const [events, setEvents] = useState<{ id: string; eventName?: string }[]>(
    []
  );
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventsLoading, setEventsLoading] = useState(true);
  const {
    status,
    capabilities,
    isLoading,
    isTrialing,
    trialEndsAt,
    deniedGrowthTools,
  } = useHostPlanCapabilities();

  const isGrowthTabDenied = (tab: PremiumTab) =>
    isTrialing && deniedGrowthTools.includes(tab);

  useEffect(() => {
    const parsed = parseHostPremiumTab(tabFromUrl);
    if (parsed && !isGrowthTabDenied(parsed)) setTabType(parsed);
    else if (parsed && isGrowthTabDenied(parsed)) setTabType("video_requests");
  }, [tabFromUrl, isTrialing, deniedGrowthTools]);

  useEffect(() => {
    if (isGrowthTabDenied(tabType)) setTabType("video_requests");
  }, [tabType, isTrialing, deniedGrowthTools]);

  useEffect(() => {
    setEventsLoading(true);
    void getHostEventsAction({ limit: 100 })
      .then(res => {
        if (!res.success || !res.data) {
          setEvents([]);
          return;
        }
        const list = parseHostEventsPickList(res.data);
        setEvents(list);
        setSelectedEventId(prev => prev || list[0]?.id || "");
      })
      .finally(() => setEventsLoading(false));
  }, []);

  const showFeatures =
    status === "active" && capabilities.usePremiumDashboardActions;
  const showLapsedFeatures =
    status === "lapsed" && capabilities.viewPremiumFeatureUi;
  const showPricing = status === "none";

  const featureTabs = (
    <Tabs
      value={tabType}
      onValueChange={val => setTabType(val as PremiumTab)}
      className="px-0"
    >
      <div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden">
        <TabsList className="flex h-14! w-max min-w-full flex-nowrap gap-1">
          <TabsTrigger
            value="video_requests"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
          >
            Video Requests
          </TabsTrigger>

          {!isGrowthTabDenied("video_coowners") ? (
            <TabsTrigger
              value="video_coowners"
              className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
            >
              Video Co-owners
            </TabsTrigger>
          ) : null}

          <TabsTrigger
            value="advanced_video_analytics"
            className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
          >
            Advanced video analytics
          </TabsTrigger>

          {!isGrowthTabDenied("playlist") ? (
            <TabsTrigger
              value="playlist"
              className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
            >
              Playlist
            </TabsTrigger>
          ) : null}

          {!isGrowthTabDenied("event_room_access_control") ? (
            <TabsTrigger
              value="event_room_access_control"
              className="data-[state=active]:border-b-primary h-13! shrink-0 rounded-none bg-white px-4 font-semibold whitespace-nowrap data-[state=active]:border-b-2"
            >
              Event room access control
            </TabsTrigger>
          ) : null}
        </TabsList>
      </div>

      <TabsContent
        value="channel_manage"
        className="space-y-6"
      >
        <p className="text-muted-foreground text-sm">
          Manage the default channel for each event room - toggle show view
          count, show amount raised, and customize tip layout.
        </p>
        <HostChannelManageClient />
      </TabsContent>

      <TabsContent
        value="video_requests"
        className="space-y-6"
      >
        <HostVideoRequestsClient />
      </TabsContent>

      {!isGrowthTabDenied("video_coowners") ? (
        <TabsContent
          value="video_coowners"
          forceMount
          className="space-y-6"
        >
          <HostVideoCoOwnersClient />
        </TabsContent>
      ) : null}

      <TabsContent
        value="advanced_video_analytics"
        forceMount
        className="space-y-6"
      >
        <VideoAnalyticsPanel variant="advanced" />
      </TabsContent>
      {!isGrowthTabDenied("playlist") ? (
        <TabsContent
          value="playlist"
          forceMount
          className="space-y-6"
        >
          <HostPlaylistsClient />
        </TabsContent>
      ) : null}
      {!isGrowthTabDenied("event_room_access_control") ? (
        <TabsContent value="event_room_access_control">
          <div className="space-y-4">
            {events.length > 1 ? (
              <Select
                value={selectedEventId || undefined}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(ev => (
                    <SelectItem
                      key={ev.id}
                      value={ev.id}
                    >
                      {ev.eventName?.trim() || ev.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {eventsLoading ? (
              <p className="text-muted-foreground text-sm">Loading events…</p>
            ) : selectedEventId ? (
              <EventRoomAccessControl
                eventId={selectedEventId}
                hostId={hostId || undefined}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Create an event to configure invite-only access.
              </p>
            )}
          </div>
        </TabsContent>
      ) : null}
    </Tabs>
  );

  return (
    <section
      className="relative min-h-screen w-full space-y-4"
      style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
    >
      <DashboardHeading
        title="Host Growth"
        subtitle="Manage your premium plan and features."
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
              Your Growth plan has expired. Features below are read-only until
              you renew.
            </p>
            <HostSubscriptionUpgradeTrigger
              focusTier="premium"
              renewLabel="Renew Premium"
              label="Renew plan"
            />
          </div>
          <ReadOnlyOverlay>{featureTabs}</ReadOnlyOverlay>
        </div>
      ) : showFeatures ? (
        <div className="space-y-4">
          {isTrialing && trialEndsAt ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
              Free trial active — full billing starts{" "}
              {new Date(String(trialEndsAt)).toLocaleDateString()}. Some Growth
              tools are limited during trial.
            </div>
          ) : null}
          {featureTabs}
        </div>
      ) : (
        <HostSubscriptionPricingPanel focusTier="premium" />
      )}
    </section>
  );
};
