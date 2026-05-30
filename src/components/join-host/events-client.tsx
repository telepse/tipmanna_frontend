"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Third-party imports
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { formatDate, formatTime } from "@/lib/utils";
import { EventStatus } from "../shared/event-status";
import { Event } from "@/types";

interface Props {
  events: Event[];
}

const renderFormattedText = (str: string) => {
  if (str.length <= 20) {
    return <span>{str}</span>;
  }

  // Find the last complete word within the first 20 characters
  let firstLine = str.slice(0, 20);

  // If the 20th character is in the middle of a word, backtrack to the last space
  if (str[20] !== " " && str[20] !== undefined) {
    const lastSpaceIndex = firstLine.lastIndexOf(" ");
    if (lastSpaceIndex !== -1) {
      firstLine = str.slice(0, lastSpaceIndex);
    }
    // If no space found, keep the 20-character break (word is too long)
  }

  const remaining = str.slice(firstLine.length).trim(); // Remove leading space if any

  let secondLine = "";
  if (remaining) {
    secondLine = remaining.slice(0, 17);

    // If we're in the middle of a word at 17 characters, backtrack
    if (remaining.length > 17 && remaining[17] !== " ") {
      const lastSpaceIndex = secondLine.lastIndexOf(" ");
      if (lastSpaceIndex !== -1) {
        secondLine = secondLine.slice(0, lastSpaceIndex);
      }
    }

    // Add ellipsis if there's more content after the second line
    if (remaining.length > secondLine.length) {
      secondLine += "...";
    }
  }

  return (
    <>
      <span>{firstLine}</span>
      {secondLine && (
        <>
          <br />
          <span>{secondLine}</span>
        </>
      )}
    </>
  );
};

export const EventsClient = ({ events }: Props) => {
  const [current, setCurrent] = useState(0);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [loading] = useState(false);
  const router = useRouter();

  const next = () => {
    if (events.length <= 1) return; // prevent cycling if 0 or 1 event
    setCurrent(i => (i === events.length - 1 ? 0 : i + 1));
  };

  const visibleEvents = events.length > 0 ? [events[current]] : [];

  const handleEnterEvent = (eventId: string) => {
    const token = Date.now().toString();
    sessionStorage.setItem(`event-token-${eventId}`, token);

    setLoadingEventId(eventId);
    router.push(`/room/${eventId}?token=${token}`);
  };

  return (
    <>
      {events.length > 0 && (
        <div className="mb-4 text-center sm:-ml-12">
          <h2 className="text-2xl font-semibold">
            {renderFormattedText(events[current].eventName)}
          </h2>
          <p className="text-muted-foreground text-center font-medium">
            {events[current].organizationName.substring(0, 20)}
            {events[current].organizationName.length > 20 ? "..." : ""}
          </p>
        </div>
      )}

      <div className="flex w-full flex-row items-center gap-4">
        <div className="flex-1 items-center gap-4 sm:gap-6">
          {visibleEvents.map((event: Event) => (
            <div
              key={event.id}
              className="bg-card space-y-2 rounded-xl border p-4 shadow-sm"
            >
              <div className="relative">
                <Image
                  src={event.eventBanner || "/events/event_banner.webp"}
                  alt={event.eventName}
                  width={320}
                  height={180}
                  className="h-[180px] w-[320px] rounded-xl object-cover"
                />
                <div className="absolute top-2 left-2">
                  <EventStatus
                    eventDate={event.eventDate}
                    startTime={event.startTime}
                    endTime={event.endTime}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <h5 className="font-semibold">
                  {event.eventName.substring(0, 20)}
                  {event.eventName.length > 20 ? "..." : ""}
                </h5>
                <p className="text-muted-foreground text-sm">
                  Organised by {event.organizationName.substring(0, 20)}
                  {event.organizationName.length > 20 ? "..." : ""}
                </p>
              </div>

              <p className="text-muted-foreground mt-2 flex items-center gap-1 text-sm">
                <Calendar /> {formatDate(event.eventDate)} &middot;{" "}
                {formatTime(event.startTime)}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <MapPin /> {event.venueLocation}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <Users /> {event.numOfTips || 0} Tips
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/")}
                >
                  <ArrowLeft /> Home
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => handleEnterEvent(event.id)}
                >
                  {loadingEventId === event.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <span>Joining...</span>
                    </div>
                  ) : (
                    "Join Event"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {events.length >= 1 && (
          <Button
            variant="outline"
            size="icon"
            className="border-muted-foreground next-event"
            onClick={next}
            disabled={events.length <= 1 || loading}
          >
            <ChevronRight className="size-6" />
          </Button>
        )}
      </div>
    </>
  );
};
