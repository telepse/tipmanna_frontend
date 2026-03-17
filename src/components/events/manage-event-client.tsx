"use client";

import { useState } from "react";

// Third-party imports
import { Tabs, TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";

// Local imports
import { ManageEventCard } from "@/components/dashboard/manage-event-card";
import { Event } from "@/types/event.types";
import { ManageEventCardSkeleton } from "../dashboard/manage-event-card-skeleton";
import { useHostEventsTabs } from "@/hooks/useHostEventsTabs";

export const ManageEventClient = () => {
  const [tabType, setTabType] = useState<
    "all_events" | "approved_events" | "pending_events"
  >("all_events");

  const { all, approved, pending } = useHostEventsTabs();

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
                />
              ))}
        </TabsContent>
      </Tabs>
    </>
  );
};
