/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Third-party imports
import { Settings, Pin } from "lucide-react";
import { useSelector } from "react-redux";

// Local imports
import { EventUserInline } from "./event-user-inline";
import { EventRating } from "./event-rating";
import { ContentRoomSettings } from "./content-room-settings";
import { RootState } from "@/redux/store";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";

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

  useEffect(() => {
    if (searchParams.get("openAddVideo") === "1" && eventOwner) {
      setModalOpen(true);
    }
  }, [searchParams, eventOwner]);

  return (
    <div
      className={`flex h-10 items-center justify-between gap-4 rounded-tl-2xl rounded-tr-2xl ${backgroundClass} sticky top-0 z-10 p-4`}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <EventUserInline
            iTipped={iTipped}
            eventId={eventId}
          />
        </div>
      </div>

      <div className="relative flex items-center gap-1">
        {/* <EventRating iTipped={iTipped} /> */}
        {eventOwner && (
          <div>
            <Settings
              className={`cursor-pointer opacity-50 ${tag === "COHOST" ? "text-destructive" : "text-room-messages"}`}
              onClick={() => setModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* 🎯 Event Room Settings Modal */}
      {modalOpen && (
        <div
          className={`${OVERLAY_Z_INDEX} fixed inset-0 flex items-center justify-center bg-black/50`}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
            <ContentRoomSettings
              isHost={true}
              isCohost={true}
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
