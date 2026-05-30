import { useState } from "react";
import { EventChannelModal } from "./event-channel-modal";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AddProjectsModal } from "./add-projects-modal";
import { AddPerformersModal } from "./add-performers-modal";

interface SectionItem {
  title: string;
  // icon: React.ReactNode;
  onClick: () => void;
  show?: boolean; // optional: show only for host/cohost
}

interface Performer {
  name: string;
  description?: string;
}

interface Project {
  name: string;
  description?: string;
}

export const ContentRoomSettings = ({
  isHost,
  isCohost,
  eventId,
  channels,
  frameId,
  liveVideoLink,
  contributionType,
  performers,
  projects,
  eventEventType,
  onClose,
}: {
  isHost: boolean;
  isCohost: boolean;
  eventId: string;
  channels: EventRoomVideoChannel[];
  frameId: string;
  liveVideoLink: string;
  contributionType: string;
  performers: Performer[];
  projects: Project[];
  /** Parent Event.eventType — defaults for “same as event” video theme */
  eventEventType?: string;
  onClose: () => void;
}) => {
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [performersModalOpen, setPerformersModalOpen] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
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
      title: "Add videos to room channel",
      // icon: <Youtube className="size-5" />,
      onClick: () => setChannelModalOpen(true),
      show: isHost,
    },

    // {
    //   title: "Pin performers stats",
    //   // icon: <Star className="size-5" />,
    //   onClick: () => console.log("Pin Performers Stats"),
    //   show: isHost,
    // },

    {
      title: `Add or view ${contributionType === "PERFORMER" ? "performers" : "projects"}`,
      onClick:
        contributionType === "PERFORMER"
          ? () => setPerformersModalOpen(true)
          : () => setProjectsModalOpen(true),
      show: isHost,
    },
  ];

  return (
    <Dialog
      open={true}
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-[320px] rounded-md bg-white p-6 sm:max-w-sm">
        <DialogHeader className="text-center text-lg font-semibold">
          <DialogTitle>Content room settings</DialogTitle>
        </DialogHeader>

        <section className="flex flex-col gap-4">
          <div className="w-full max-w-md divide-y divide-gray-200 overflow-hidden bg-white">
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
            eventEventType={eventEventType}
          />

          <AddPerformersModal
            open={performersModalOpen}
            onClose={() => setPerformersModalOpen(false)}
            isHost={isHost}
            eventId={eventId}
            performers={performers} // fetch existing projects if you want
            setPerformers={updatedPerformers =>
              console.log("New performers", updatedPerformers)
            }
          />

          <AddProjectsModal
            open={projectsModalOpen}
            onClose={() => setProjectsModalOpen(false)}
            isHost={isHost}
            eventId={eventId}
            projects={projects} // fetch existing projects if you want
            setProjects={updatedProjects =>
              console.log("New projects", updatedProjects)
            }
          />
        </section>
      </DialogContent>
    </Dialog>
  );
};
