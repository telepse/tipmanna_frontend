/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { EventChannelModal } from "./event-channel-modal";

interface SectionItem {
  title: string;
  // icon: React.ReactNode;
  onClick: () => void;
  show?: boolean; // optional: show only for host/cohost
}

interface EventChannel {
  id: string;
  name: string;
  videos: { id: number; url: string; tips: number }[];
  mainVideoIndex: number;
}

export const EventRoomSettingsList = ({
  isHost,
  isCohost,
  eventId,
  channels,
  frameId,
  liveVideoLink,
}: {
  isHost: boolean;
  isCohost: boolean;
  eventId: string;
  channels: any[];
  frameId: string;
  liveVideoLink: string;
}) => {
  const [channelModalOpen, setChannelModalOpen] = useState(false);

  const sections: SectionItem[] = [
    {
      title: "Drop message in event room",
      // icon: <Settings className="size-5" />,
      onClick: () => console.log("Open Drop Message"),
      show: isHost,
    },
    // {
    //   title: "Add Timestamp",
    //   icon: <Clock className="size-5" />,
    //   onClick: () => console.log("Open Timestamp Settings"),
    //   show: isHost || isCohost,
    // },
    // {
    //   title: "Restart Tip Target for a session",
    //   icon: <RefreshCcw className="size-5" />,
    //   onClick: () => console.log("Open Tip Reset"),
    //   show: isHost,
    // },
    // {
    //   title: "Request Report (7 days)",
    //   icon: <FileText className="size-5" />,
    //   onClick: () => console.log("Request Report"),
    //   show: isHost || isCohost,
    // },
    {
      title: "Switch event session",
      // icon: <PlusCircle className="size-5" />,
      onClick: () => console.log("Add Progress Bar / Session"),
      show: isHost,
    },
    {
      title: "Add videos to event channel",
      // icon: <Youtube className="size-5" />,
      onClick: () => setChannelModalOpen(true),
      show: isHost,
    },

    {
      title: "Pin performers stats",
      // icon: <Star className="size-5" />,
      onClick: () => console.log("Pin Performers Stats"),
      show: isHost,
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold sm:text-2xl">Event Room Settings</h2>

      <div className="w-full max-w-md divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-lg">
        {sections
          .filter(section => section.show !== false)
          .map((section, idx) => (
            <button
              key={idx}
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-100"
              onClick={section.onClick}
            >
              <div className="flex items-center gap-3">
                <span className="size-1 rounded-full bg-black"></span>
                <span className="text-sm font-medium">{section.title}</span>
              </div>
              <span className="text-gray-400">{">"}</span>
            </button>
          ))}
      </div>

      {/* 🎬 Event Channel Sub-Modal */}
      <EventChannelModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        channels={channels}
        isHost={isHost}
        eventId={eventId}
        frameId={frameId}
        liveVideoLink={liveVideoLink}
      />
    </section>
  );
};
