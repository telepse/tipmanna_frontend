/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef } from "react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";

// Local imports
import { Badge } from "@/components/shared/badge";
import { Title } from "@/components/shared/title";
import { TopEventCard } from "./top-event-card";
import { Event } from "@/types/event.types";

interface Props {
  events: Event[];
  // contents: any[];
}

export default function TopEvents({ events }: Props) {
  const topContentsRef = useRef<HTMLDivElement>(null);

  return (
    <section className="wrapper section py-12">
      <div className="flex flex-col">
        <Badge title="Events" />
        <h2 id="top-events-heading">
          <Title size="lg">
            Top <span className="text-primary">events</span>
          </Title>
        </h2>
      </div>

      {/* Small and medium screens */}
      <div className="no-scrollbar hide__scrollbar relative flex items-center gap-4 overflow-x-auto lg:hidden">
        <div className="flex w-full snap-x snap-mandatory space-x-4">
          {events.map(event => (
            <div
              key={event.id}
              className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
            >
              <TopEventCard
                key={event.id}
                channelId={event.id}
                roomId={event.id}
                eventBanner={event.eventBanner}
                eventName={event.eventName}
                organizationName={event.organizationName}
                amountRaised={event.amountRaised}
                numOfTips={event.numOfTips}
                eventDate={event.eventDate}
                startTime={event.startTime}
                endTime={event.endTime}
              />
            </div>
          ))}
        </div>
      </div>

      {/* LARGE SCREENS */}
      <div className="no-scrollbar hide__scrollbar relative hidden items-center gap-4 overflow-x-auto lg:flex">
        <div
          ref={topContentsRef}
          className="flex w-[550px] snap-x snap-mandatory space-x-4"
        >
          {events.map(event => (
            <div
              key={event.id}
              className="w-[85%] flex-shrink-0 snap-center transition-transform duration-300 sm:w-[50%]"
            >
              <TopEventCard
                key={event.id}
                channelId={event.id}
                roomId={event.id}
                eventBanner={event.eventBanner}
                eventName={event.eventName}
                organizationName={event.organizationName}
                amountRaised={event.amountRaised}
                numOfTips={event.numOfTips}
                eventDate={event.eventDate}
                startTime={event.startTime}
                endTime={event.endTime}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
