"use client";

import { useState } from "react";

// Third-party imports
import { Tabs, TabsTrigger, TabsList, TabsContent } from "@/components/ui/tabs";

// Local imports
import { Event } from "@/types/event.types";
import { VenueEventCard } from "./venue-event-card";
import { useHostEventsForTabsByStatus } from "@/hooks/useHostEventsForTabsByStatus";
import { VenueEventCardSkeleton } from "./venue-event-card-skeleton";

export const VenueDisplayClient = () => {
  const [tabType, setTabType] = useState<
    "ongoing_events" | "notstarted_events"
  >("ongoing_events");

  const { all, ongoing, notStarted } = useHostEventsForTabsByStatus();
  console.log(all);

  return (
    <>
      {/* <Tabs
        value={tabType}
        onValueChange={val =>
          setTabType(val as "ongoing_events" | "notstarted_events")
        }
        className="section px-0"
      > */}
      {/* <TabsList className="flex h-14! w-full gap-1">
          <TabsTrigger
            value="ongoing_events"
            className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
          >
            Events
          </TabsTrigger>
          <TabsTrigger
            value="notstarted_events"
            className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
          >
            Contents
          </TabsTrigger>
        </TabsList> */}

      {/* Ongoing events */}
      {/* <TabsContent
          value="ongoing_events"
          className="mt-6 space-y-6"
        >
          {ongoing?.length === 0
            ? Array.from({ length: 3 }).map((_, idx) => (
                <VenueEventCardSkeleton key={idx} />
              ))
            : ongoing.map((event: Event) => (
                <VenueEventCard
                  key={event.id}
                  id={event.id}
                  eventName={event.eventName}
                  eventDate={event.eventDate}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  hostName={event.hostName}
                  performers={event.performers}
                  projects={event.projects}
                  approved={event.approved}
                  amountRaised={event.amountRaised}
                  numOfTips={event.numOfTips}
                  amountToRaise={event.amountToRaise}
                  eventBackground={event.eventBackground}
                  showLatestAmount={event.showLatestAmount}
                  hideProgressBarAmount={event.hideProgressBarAmount}
                  tipUsageDisclosure={event.tipUsageDisclosure}
                  latestTipAmount={event.latestTipAmount}
                  moneyFor={event.moneyFor}
                />
              ))}
        </TabsContent> */}

      {/* Not started events */}
      {/* <TabsContent
          value="notstarted_events"
          className="mt-6 space-y-6"
        >
          {notStarted?.length === 0
            ? Array.from({ length: 3 }).map((_, idx) => (
                <VenueEventCardSkeleton key={idx} />
              ))
            : notStarted.map((event: Event) => (
                <VenueEventCard
                  key={event.id}
                  id={event.id}
                  eventName={event.eventName}
                  eventDate={event.eventDate}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  hostName={event.hostName}
                  performers={event.performers}
                  projects={event.projects}
                  approved={event.approved}
                  amountRaised={event.amountRaised}
                  numOfTips={event.numOfTips}
                  amountToRaise={event.amountToRaise}
                  eventBackground={event.eventBackground}
                  showLatestAmount={event.showLatestAmount}
                  hideProgressBarAmount={event.hideProgressBarAmount}
                  tipUsageDisclosure={event.tipUsageDisclosure}
                  latestTipAmount={event.latestTipAmount}
                  moneyFor={event.moneyFor}
                />
              ))}
        </TabsContent> */}
      {/* </Tabs> */}

      <div className="mt-6 space-y-6">
        {all?.length === 0
          ? Array.from({ length: 3 }).map((_, idx) => (
              <VenueEventCardSkeleton key={idx} />
            ))
          : all.map((event: Event) => (
              <VenueEventCard
                key={event.id}
                id={event.id}
                eventName={event.eventName}
                eventDate={event.eventDate}
                startTime={event.startTime}
                endTime={event.endTime}
                hostName={event.hostName}
                performers={event.performers}
                projects={event.projects}
                approved={event.approved}
                amountRaised={event.amountRaised}
                numOfTips={event.numOfTips}
                amountToRaise={event.amountToRaise}
                eventBackground={event.eventBackground}
                showLatestAmount={event.showLatestAmount}
                hideProgressBarAmount={event.hideProgressBarAmount}
                tipUsageDisclosure={event.tipUsageDisclosure}
                latestTipAmount={event.latestTipAmount}
                moneyFor={event.moneyFor}
              />
            ))}
      </div>
    </>
  );
};
