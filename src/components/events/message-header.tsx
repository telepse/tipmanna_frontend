/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Third-party imports
import { Settings, Pin, Plus, PencilLine, Ellipsis } from "lucide-react";
import { useSelector } from "react-redux";

// Local imports
import { EventUserInline } from "./event-user-inline";
import { EventRating } from "./event-rating";
import { ContentRoomSettings } from "./content-room-settings";
import { RootState } from "@/redux/store";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { CreateDialog } from "../home/create-dialog";
import { Dialog, DialogContent } from "../ui/dialog";
import Image from "next/image";
import { EventRoomDropMessageModal } from "./event-room-drop-message-modal";
import { EventDetailDialog } from "./event-detail-dialog";
import { EventSetReminderButton } from "./event-set-reminder-button";
import { isEventUpcomingClient } from "@/lib/event-schedule-client";

export function formatEventDateTime(
  eventDate: string,
  startTime: string,
  endTime: string
): string {
  const date = new Date(eventDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formatTime = (time: string) => {
    const [hoursString, minutesString = "00"] = time.split(":");

    const hours = Number(hoursString);
    const minutes = Number(minutesString);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return "";
    }

    const period = hours >= 12 && hours < 24 ? "PM" : "AM";

    const hour12 = hours % 12 || 12;

    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
  };

  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);

  return `${formattedDate} | ${formattedStartTime} - ${formattedEndTime}`;
}

const formatEventTime = (time: string) => {
  const [hoursString, minutesString = "00"] = time.split(":");

  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return "";
  }

  const period = hours >= 12 && hours < 24 ? "PM" : "AM";

  const hour12 = hours % 12 || 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
};

interface Props {
  eventId: string;
  iTipped: number;
  channels: EventRoomVideoChannel[];
  frameId: string;
  isEventOwner: string;
  liveVideoLink: string;
  performers: any[];
  projects: any[];
  contributionType: string;
  eventEventType?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timeZone?: string;
  eventName: string;
  organizationName: string;
  eventBanner: string;
  venueName: string;
  venueLocation: string;
  activities: any[];
  eventDescription: string;
}

export const MessageHeader = ({
  eventId,
  iTipped,
  channels,
  frameId,
  isEventOwner,
  liveVideoLink,
  performers,
  projects,
  contributionType,
  eventEventType,
  eventDate,
  startTime,
  endTime,
  timeZone,
  eventName,
  organizationName,
  eventBanner,
  venueName,
  venueLocation,
  activities,
  eventDescription,
}: Props) => {
  const safeChannels = Array.isArray(channels) ? channels : [];
  const safePerformers = Array.isArray(performers) ? performers : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const backgroundClass = !isScrolled ? "bg-white" : "bg-black/50";

  const [modalOpen, setModalOpen] = useState(false);
  const searchParams = useSearchParams();

  const { user, tag } = useSelector((state: RootState) => state.auth);

  const eventOwner = isEventOwner === user?.id || tag === "COHOST";
  const role = user?.role;

  console.log("eventOwner", eventOwner);
  console.log("isEventOwner", isEventOwner);

  const [dropMessageModalOpen, setDropMessageModalOpen] = useState(false);

  const [openPopup, setOpenPopup] = useState(false);
  const [openEventDetail, setOpenEventDetail] = useState(false);

  useEffect(() => {
    if (searchParams.get("openAddVideo") === "1" && eventOwner) {
      setModalOpen(true);
    }
  }, [searchParams, eventOwner]);

  const isEventOver = !isEventUpcomingClient({
    eventDate,
    startTime,
    endTime,
    timeZone,
  });

  return (
    <div className="sticky top-0 z-10">
      {/* Existing white message bar */}
      <div
        className={`relative flex h-10 items-center justify-between gap-4 rounded-tl-2xl rounded-tr-2xl ${backgroundClass} p-4`}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <EventUserInline
              iTipped={iTipped}
              eventId={eventId}
            />
          </div>

          <button
            type="button"
            className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-full p-1"
            onClick={() => {
              setOpenPopup(true);
            }}
          >
            <Plus className="size-5" />
            <span className="text-[8px]">Create</span>
          </button>
        </div>

        <CreateDialog
          openPopup={openPopup}
          setOpenPopup={setOpenPopup}
        />

        <div className="relative flex items-center gap-1">
          {/* <EventRating iTipped={iTipped} /> */}

          {eventOwner && tag !== "COHOST" && (
            <span className="text-muted-foreground text-[10px]">
              Host detected
            </span>
          )}

          {tag === "COHOST" && (
            <span className="text-muted-foreground text-[10px]">
              Cohost detected
            </span>
          )}

          {eventOwner && (
            <div className="flex items-center gap-1">
              <PencilLine
                className={`size-5 cursor-pointer opacity-50 ${
                  tag === "COHOST" ? "text-destructive" : "text-room-messages"
                }`}
                onClick={() => setDropMessageModalOpen(true)}
              />
              <Settings
                className={`cursor-pointer opacity-50 ${
                  tag === "COHOST" ? "text-destructive" : "text-room-messages"
                }`}
                onClick={() => setModalOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      <EventRoomDropMessageModal
        open={dropMessageModalOpen}
        onClose={() => setDropMessageModalOpen(false)}
        eventId={eventId}
        eventHostId={isEventOwner}
      />

      {/* Small event date/time bar BELOW the white message bar */}
      {eventDate && (
        <div className="bg-secondary absolute top-full right-0 left-0 z-20 flex h-8 w-full items-center justify-between gap-2 rounded-b-lg border-t border-black px-3 text-xs shadow-sm sm:justify-normal lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-1">
            <div
              className="flex cursor-pointer flex-col items-center gap-1 text-[10px] text-black sm:flex-row sm:text-xs"
              onClick={() => setOpenEventDetail(prev => !prev)}
            >
              <div className="hidden flex-row items-center gap-1 underline sm:inline-flex">
                <Ellipsis className="size-5" />
                <span>Event info:</span>
              </div>

              <span className="block flex flex-col items-center border-r border-black pr-2 underline sm:hidden">
                <Ellipsis className="-mt-1 size-5" />
                <span className="-mt-1">Event info:</span>
              </span>
            </div>

            <span className="hidden text-[10px] text-black sm:inline-block sm:text-xs">
              {formatEventDateTime(eventDate, startTime, endTime)}
            </span>
          </div>

          <span className="block flex flex-col text-[10px] text-black sm:hidden sm:text-xs">
            <span>
              {new Date(eventDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>

            <span>
              {formatEventTime(startTime)} - {formatEventTime(endTime)}
            </span>
          </span>

          <EventSetReminderButton
            eventId={eventId}
            eventName={eventName}
            isEventOver={isEventOver}
          />
        </div>
      )}

      {!eventDate && (
        <div className="absolute top-full right-0 left-0 z-20 flex h-7 w-full items-center gap-2 rounded-b-lg border-t border-gray-200 bg-white px-3 text-xs text-gray-600 shadow-sm">
          <i className="italic">No event info</i>
        </div>
      )}

      {openEventDetail && (
        <EventDetailDialog
          eventBanner={eventBanner}
          eventName={eventName}
          eventDescription={eventDescription}
          venueName={venueName}
          venueLocation={venueLocation}
          eventDate={eventDate}
          startTime={startTime}
          endTime={endTime}
          activities={activities}
          open={openEventDetail}
          onOpenChange={open => setOpenEventDetail(open)}
        />
      )}

      {/* Event Room Settings Modal */}
      {modalOpen && (
        <div
          className={`${OVERLAY_Z_INDEX} fixed inset-0 flex items-center justify-center bg-black/50`}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
            <ContentRoomSettings
              isHost={eventOwner}
              isCohost={tag === "COHOST"}
              eventId={eventId}
              eventHostId={isEventOwner}
              channels={safeChannels}
              frameId={frameId}
              liveVideoLink={liveVideoLink}
              contributionType={contributionType}
              projects={safeProjects}
              performers={safePerformers}
              eventEventType={eventEventType}
              onClose={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
