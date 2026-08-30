import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { EventChannelModal } from "./event-channel-modal";
import { EventRoomDropMessageModal } from "./event-room-drop-message-modal";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AddProjectsModal } from "./add-projects-modal";
import { AddPerformersModal } from "./add-performers-modal";
import { SelectDefaultVideoModal } from "./select-default-video-modal";
import { Crown } from "lucide-react";

interface SectionItem {
  title: string;
  // icon: React.ReactNode;
  onClick: () => void;
  show?: boolean; // optional: show only for host/cohost
  isPremium?: boolean;
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
  eventHostId,
  channels,
  frameId,
  liveVideoLink,
  contributionType,
  performers,
  projects,
  eventEventType,
  onClose,
  onChannelCreated,
}: {
  isHost: boolean;
  isCohost: boolean;
  eventId: string;
  eventHostId: string;
  channels: EventRoomVideoChannel[];
  frameId: string;
  liveVideoLink: string;
  contributionType: string;
  performers: Performer[];
  projects: Project[];
  /** Parent Event.eventType — defaults for “same as event” video theme */
  eventEventType?: string;
  onClose: () => void;
  onChannelCreated?: (channel: EventRoomVideoChannel) => void;
}) => {
  const searchParams = useSearchParams();
  const seedModalDraftId = searchParams.get("modalDraftId");
  const [selectDefaultVideoModalOpen, setSelectDefaultVideoModalOpen] =
    useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [dropMessageModalOpen, setDropMessageModalOpen] = useState(false);
  const [performersModalOpen, setPerformersModalOpen] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);

  const canManageChannel = isHost || isCohost;

  useEffect(() => {
    if (searchParams.get("openAddVideo") === "1" && canManageChannel) {
      setChannelModalOpen(true);
    }
  }, [searchParams, canManageChannel]);

  const sections: SectionItem[] = [
    {
      title: "Select streaming video",
      onClick: () => setSelectDefaultVideoModalOpen(true),
      show: canManageChannel,
    },
    {
      title: "Add videos to room channel",
      onClick: () => setChannelModalOpen(true),
      show: canManageChannel,
    },

    {
      title: `Add or pin ${contributionType === "PERFORMER" ? "performers" : "projects"}`,
      onClick:
        contributionType === "PERFORMER"
          ? () => setPerformersModalOpen(true)
          : () => setProjectsModalOpen(true),
      show: canManageChannel,
      isPremium: true,
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
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${section.isPremium ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      {section.title}{" "}
                      {section.isPremium && <Crown className="text-primary" />}
                    </div>
                  </div>
                  <span className="text-gray-400">{">"}</span>
                </button>
              ))}
          </div>

          {/* 🎬 Event Channel Sub-Modal */}
          <EventRoomDropMessageModal
            open={dropMessageModalOpen}
            onClose={() => setDropMessageModalOpen(false)}
            eventId={eventId}
            eventHostId={eventHostId}
          />

          <SelectDefaultVideoModal
            open={selectDefaultVideoModalOpen}
            onClose={() => setSelectDefaultVideoModalOpen(false)}
            channels={channels}
            isHost={canManageChannel}
            eventId={eventId}
            frameId={frameId}
            liveVideoLink={liveVideoLink}
            eventEventType={eventEventType}
            seedDraftId={seedModalDraftId}
            onChannelCreated={onChannelCreated}
          />

          <EventChannelModal
            open={channelModalOpen}
            onClose={() => setChannelModalOpen(false)}
            isHost={canManageChannel}
            eventId={eventId}
            eventEventType={eventEventType}
            seedDraftId={seedModalDraftId}
            resumeSurface="content_room_settings"
            onChannelCreated={onChannelCreated}
          />

          <AddPerformersModal
            open={performersModalOpen}
            onClose={() => setPerformersModalOpen(false)}
            isHost={canManageChannel}
            eventId={eventId}
            performers={performers} // fetch existing projects if you want
            setPerformers={updatedPerformers =>
              console.log("New performers", updatedPerformers)
            }
          />

          <AddProjectsModal
            open={projectsModalOpen}
            onClose={() => setProjectsModalOpen(false)}
            isHost={canManageChannel}
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
