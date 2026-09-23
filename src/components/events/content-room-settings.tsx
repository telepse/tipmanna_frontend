import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { getEventRoomVisitAnalyticsAction } from "@/actions/events";
import { EventChannelModal } from "./event-channel-modal";
import { EventRoomDropMessageModal } from "./event-room-drop-message-modal";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AddProjectsModal } from "./add-projects-modal";
import { AddPerformersModal } from "./add-performers-modal";
import { SelectDefaultVideoModal } from "./select-default-video-modal";
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
  onPerformersUpdated,
  onProjectsUpdated,
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
  onPerformersUpdated?: (performers: Performer[]) => void;
  onProjectsUpdated?: (projects: Project[]) => void;
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
  const [visitStats, setVisitStats] = useState<{
    visits90d: number;
    visits7d: number;
    visits24h: number;
  } | null>(null);
  const [visitStatsState, setVisitStatsState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");

  useEffect(() => {
    if (!canManageChannel || !eventId) return;
    let cancelled = false;
    setVisitStatsState("loading");
    setVisitStats(null);
    void (async () => {
      const res = await getEventRoomVisitAnalyticsAction(eventId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setVisitStatsState("error");
        return;
      }
      setVisitStats(res.data);
      setVisitStatsState("loaded");
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageChannel, eventId]);

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
          {canManageChannel ? (
            <div className="rounded-lg border bg-gray-50 px-3 py-2 text-xs">
              <p className="text-muted-foreground mb-1 font-medium tracking-wide uppercase">
                Room visits
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {visitStatsState === "loading" ? (
                  "Loading…"
                ) : visitStatsState === "error" ? (
                  <span className="text-muted-foreground font-normal">
                    Could not load visit stats
                  </span>
                ) : (
                  <>
                    {visitStats?.visits90d ?? 0} (90d) ·{" "}
                    {visitStats?.visits7d ?? 0} (7d) ·{" "}
                    {visitStats?.visits24h ?? 0} (24h)
                  </>
                )}
              </p>
            </div>
          ) : null}
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
                    <div className="flex items-center gap-1 text-sm font-medium">
                      {section.title}
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
            setPerformers={updatedPerformers => {
              const next =
                typeof updatedPerformers === "function"
                  ? updatedPerformers(performers as never)
                  : updatedPerformers;
              onPerformersUpdated?.(next);
            }}
          />

          <AddProjectsModal
            open={projectsModalOpen}
            onClose={() => setProjectsModalOpen(false)}
            isHost={canManageChannel}
            eventId={eventId}
            projects={projects} // fetch existing projects if you want
            setProjects={updatedProjects => {
              const next =
                typeof updatedProjects === "function"
                  ? updatedProjects(projects as never)
                  : updatedProjects;
              onProjectsUpdated?.(next);
            }}
          />
        </section>
      </DialogContent>
    </Dialog>
  );
};
