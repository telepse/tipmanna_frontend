"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { Tabs, TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";

import { ManageEventCard } from "@/components/dashboard/manage-event-card";
import { Event } from "@/types/event.types";
import { ManageEventCardSkeleton } from "../dashboard/manage-event-card-skeleton";
import { getHostEventsTabsAction } from "@/actions/events";
import type { RootState } from "@/redux/store";

export const ManageEventClient = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostSubscriptionTier =
    user?.role === "HOST" ? user.hostSubscriptionTier : undefined;
  const [tabType, setTabType] = useState<
    "all_events" | "approved_events" | "pending_events"
  >("all_events");

  const [all, setAll] = useState<Event[]>([]);
  const [approved, setApproved] = useState<Event[]>([]);
  const [pending, setPending] = useState<Event[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      const res = await getHostEventsTabsAction();
      if (!res.data || typeof res.data !== "object") return;
      const data = res.data as {
        all: Event[];
        approved: Event[];
        pending: Event[];
      };
      setAll(data.all);
      setApproved(data.approved);
      setPending(data.pending);
    };
    void fetchData();
  }, [user?.id]);

  return (
    <>
      <Tabs
        value={tabType}
        onValueChange={val =>
          setTabType(val as "all_events" | "approved_events" | "pending_events")
        }
        className="section px-0"
      >
        <TabsList className="flex h-14! w-full gap-1">
          <TabsTrigger
            value="all_events"
            className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
          >
            All Events
          </TabsTrigger>
          <TabsTrigger
            value="approved_events"
            className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
          >
            Approved
          </TabsTrigger>
          <TabsTrigger
            value="pending_events"
            className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
          >
            Pending
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="all_events"
          className="mt-6 space-y-6"
        >
          {all.length === 0
            ? Array.from({ length: 3 }).map((_, idx) => (
                <ManageEventCardSkeleton key={idx} />
              ))
            : all.map((event: Event) => (
                <ManageEventCard
                  key={event.id}
                  id={event.id}
                  eventName={event.eventName}
                  eventDate={event.eventDate}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  approved={event.approved}
                  amountRaised={event.amountRaised}
                  numOfTips={event.numOfTips}
                  showAmountRaisedOnVideos={event.showAmountRaisedOnVideos}
                  showViewCountOnVideos={event.showViewCountOnVideos}
                  hostSubscriptionTier={hostSubscriptionTier}
                />
              ))}
        </TabsContent>

        <TabsContent
          value="approved_events"
          className="mt-6 space-y-6"
        >
          {approved.length === 0
            ? Array.from({ length: 3 }).map((_, idx) => (
                <ManageEventCardSkeleton key={idx} />
              ))
            : approved.map((event: Event) => (
                <ManageEventCard
                  key={event.id}
                  id={event.id}
                  eventName={event.eventName}
                  eventDate={event.eventDate}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  approved={event.approved}
                  amountRaised={event.amountRaised}
                  numOfTips={event.numOfTips}
                  showAmountRaisedOnVideos={event.showAmountRaisedOnVideos}
                  showViewCountOnVideos={event.showViewCountOnVideos}
                  hostSubscriptionTier={hostSubscriptionTier}
                />
              ))}
        </TabsContent>

        <TabsContent
          value="pending_events"
          className="mt-6 space-y-6"
        >
          {pending.length === 0
            ? Array.from({ length: 3 }).map((_, idx) => (
                <ManageEventCardSkeleton key={idx} />
              ))
            : pending.map((event: Event) => (
                <ManageEventCard
                  key={event.id}
                  id={event.id}
                  eventName={event.eventName}
                  eventDate={event.eventDate}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  approved={event.approved}
                  amountRaised={event.amountRaised}
                  numOfTips={event.numOfTips}
                  showAmountRaisedOnVideos={event.showAmountRaisedOnVideos}
                  showViewCountOnVideos={event.showViewCountOnVideos}
                  hostSubscriptionTier={hostSubscriptionTier}
                />
              ))}
        </TabsContent>
      </Tabs>
    </>
  );
};
