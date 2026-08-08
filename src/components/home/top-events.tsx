"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { useMediaQuery } from "react-responsive";
import { Button } from "@/components/ui/button";

// Import Swiper styles
// import "swiper/css";
// import "swiper/css/pagination";

// Local imports
import { Badge } from "@/components/shared/badge";
import { Title } from "@/components/shared/title";
import { TopEventCard } from "./top-event-card";
import { Event } from "@/types/event.types";
import { LocationPrompt } from "../shared/location-prompt";

interface Props {
  events: Event[];
  // contents: any[];
}

export default function TopEvents({ events = [] }: Props) {
  const topContentsRef = useRef<HTMLDivElement>(null);

  const [showPrompt, setShowPrompt] = useState(false);
  const router = useRouter();

  // Memoized event handlers
  const handleJoinClick = useCallback(() => {
    setShowPrompt(true);
  }, []);

  const handleLocationAllow = useCallback((country: string) => {
    console.log("Allowed in", country);
    setShowPrompt(false);
  }, []);

  const handleLocationDeny = useCallback(() => {
    setShowPrompt(false);
    router.push("/join");
  }, [router]);

  const handleClosePrompt = useCallback(() => {
    setShowPrompt(false);
  }, []);

  const isMobile = useMediaQuery({
    maxWidth: "500px",
  });

  return (
    <section className="wrapper section py-12">
      <div className="flex gap-4">
        <div className="flex flex-col">
          <h2 id="top-events-heading">
            <Title size="lg">
              Top{" "}
              <span className="bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
                live events
              </span>
            </Title>
          </h2>
        </div>

        <button
          onClick={handleJoinClick}
          aria-label="Join an event to start tipping"
          aria-haspopup="dialog"
          className="mt-6 block flex cursor-pointer items-center gap-2 text-sm underline underline-offset-2 sm:text-base"
        >
          Find an event{" "}
          <ArrowRight
            className="-rotate-45"
            aria-hidden="true"
          />
        </button>
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

      <LocationPrompt
        open={showPrompt}
        onAllow={handleLocationAllow}
        onDeny={handleLocationDeny}
        onClose={handleClosePrompt}
      />
    </section>
  );
}
