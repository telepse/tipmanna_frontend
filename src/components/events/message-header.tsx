/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Third-party imports
import { Settings, Pin, Plus, Bell, PencilLine } from "lucide-react";
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
  const [showInfo, setShowInfo] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);

  useEffect(() => {
    if (searchParams.get("openAddVideo") === "1" && eventOwner) {
      setModalOpen(true);
    }
  }, [searchParams, eventOwner]);

  const isEventOver = false;

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
      />

      {/* Small event date/time bar BELOW the white message bar */}
      {eventDate && (
        <div className="bg-secondary absolute top-full right-0 left-0 z-20 flex h-8 w-full items-center justify-normal gap-2 rounded-b-lg border-t border-gray-200 px-3 text-xs shadow-sm lg:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            <div
              className="flex cursor-pointer flex-col items-center gap-1 text-xs text-black sm:flex-row"
              onClick={() => setShowEventDetails(prev => !prev)}
            >
              <span className="underline">Event info:</span>
            </div>

            <span className="text-xs text-black">
              {formatEventDateTime(eventDate, startTime, endTime)}
            </span>
          </div>

          <button
            type="button"
            className="outline-primary flex w-fit cursor-pointer items-center gap-1 rounded-md bg-white px-2 py-1 text-black outline hover:bg-white/80"
          >
            <Bell className="size-3" /> Set reminder
          </button>
        </div>
      )}

      {!eventDate && (
        <div className="absolute top-full right-0 left-0 z-20 flex h-7 w-full items-center gap-2 rounded-b-lg border-t border-gray-200 bg-white px-3 text-xs text-gray-600 shadow-sm">
          <i className="italic">No event info</i>
        </div>
      )}

      {showEventDetails && (
        <Dialog
          open={showEventDetails}
          onOpenChange={() => setShowEventDetails(prev => !prev)}
        >
          <DialogContent className="max-w-sm">
            <Image
              src={eventBanner ?? "/events/event_banner.webp"}
              alt={eventName}
              width={400}
              height={320}
              className="w-full object-cover"
            />

            {venueName?.trim() ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Venue name
                </p>
                <p className="font-medium">{venueName}</p>
              </div>
            ) : null}

            {venueLocation?.trim() ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Location
                </p>
                <p className="font-medium">{venueLocation}</p>
              </div>
            ) : null}

            {eventDate ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Event date
                </p>
                <p className="font-medium">
                  {/* {format(eventDate, "EEEE, dd MMM yyyy")} */}
                </p>
              </div>
            ) : null}

            {startTime?.trim() || endTime?.trim() ? (
              <div className="grid grid-cols-2 gap-4">
                {startTime?.trim() ? (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      Start time
                    </p>
                    <p className="font-medium">{startTime}</p>
                  </div>
                ) : null}
                {endTime?.trim() ? (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      End time
                    </p>
                    <p className="font-medium">{endTime}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* {eventType ? (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      Event type
                    </p>
                    <p className="font-medium">
                      {formatEventTypeLabel(eventType)}
                    </p>
                  </div>
                ) : null} */}

            {Array.isArray(activities) && activities.length > 0 ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Activities
                </p>
                <p className="font-medium">
                  {activities
                    .map(activity =>
                      String(activity).replace(/_/g, " ").toLowerCase()
                    )
                    .join(", ")}
                </p>
              </div>
            ) : null}

            {eventDescription?.trim() ? (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Description
                </p>
                <p className="leading-relaxed">{eventDescription}</p>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}

      {/* Event Room Settings Modal */}
      {modalOpen && (
        <div
          className={`${OVERLAY_Z_INDEX} fixed inset-0 flex items-center justify-center bg-black/50`}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
            <ContentRoomSettings
              isHost={isEventOwner === user?.id}
              isCohost={tag === "COHOST"}
              eventId={eventId}
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
