/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

// Third-party imports
import { Settings } from "lucide-react";
import { EventUserInline } from "./event-user-inline";
import { EventRating } from "./event-rating";
import { EventRoomSettingsList } from "./event-room-settings";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface Props {
  eventId: string;
  iTipped: number;
  channels: any[];
  frameId: string;
  isEventOwner: string;
  liveVideoLink: string;
}

export const MessageHeader = ({
  eventId,
  iTipped,
  channels,
  frameId,
  isEventOwner,
  liveVideoLink,
}: Props) => {
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

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const eventOwner = isEventOwner === user?.id;

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

      <div className="flex items-center gap-1">
        <EventRating iTipped={iTipped} />
        {eventOwner && (
          <Settings
            className="text-room-messages cursor-pointer opacity-50"
            onClick={() => setModalOpen(true)}
          />
        )}
      </div>

      {/* 🎯 Event Room Settings Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
            <EventRoomSettingsList
              isHost={true}
              isCohost={true}
              eventId={eventId}
              channels={channels}
              frameId={frameId}
              liveVideoLink={liveVideoLink}
            />
            <button
              className="mt-4 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
              onClick={() => setModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
