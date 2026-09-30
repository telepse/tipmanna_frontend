"use client";

import { useState } from "react";

import { Tabs, TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";

import { ManageEventCard } from "@/components/dashboard/manage-event-card";
import { Event } from "@/types/event.types";
import { ManageEventCardSkeleton } from "../dashboard/manage-event-card-skeleton";
import { useHostEventsTabs } from "@/hooks/useHostEventsTabs";
import type { HostSubscriptionPromptFns } from "@/hooks/use-host-subscription-prompt";

type Props = {
  subscriptionPrompt?: HostSubscriptionPromptFns;
};

function EventList({
  events,
  showSkeleton,
  emptyLabel,
  subscriptionPrompt,
}: {
  events: Event[];
  showSkeleton: boolean;
  emptyLabel: string;
  subscriptionPrompt?: HostSubscriptionPromptFns;
}) {
  if (showSkeleton) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, idx) => (
          <ManageEventCardSkeleton key={idx} />
        ))}
      </>
    );
  }

  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <>
      {events.map((event: Event) => (
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
          showEncounterOnVideos={event.showEncounterOnVideos}
          subscriptionPrompt={subscriptionPrompt}
        />
      ))}
    </>
  );
}

export const ManageEventClient = ({ subscriptionPrompt }: Props) => {
  const [tabType, setTabType] = useState<
    "all_events" | "approved_events" | "pending_events"
  >("all_events");

  const { all, approved, pending, hasData, isLoading } = useHostEventsTabs();
  const showSkeleton = isLoading && !hasData;

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
          <EventList
            events={all}
            showSkeleton={showSkeleton}
            emptyLabel="No events yet."
            subscriptionPrompt={subscriptionPrompt}
          />
        </TabsContent>

        <TabsContent
          value="approved_events"
          className="mt-6 space-y-6"
        >
          <EventList
            events={approved}
            showSkeleton={showSkeleton}
            emptyLabel="No approved events."
            subscriptionPrompt={subscriptionPrompt}
          />
        </TabsContent>

        <TabsContent
          value="pending_events"
          className="mt-6 space-y-6"
        >
          <EventList
            events={pending}
            showSkeleton={showSkeleton}
            emptyLabel="No pending events."
            subscriptionPrompt={subscriptionPrompt}
          />
        </TabsContent>
      </Tabs>
    </>
  );
};
