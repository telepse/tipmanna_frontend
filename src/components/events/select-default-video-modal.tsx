"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { ApiError } from "@/types/api-error.types";
import { updateDefaultChannel } from "@/actions/events";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import type { DraftResumeOrigin } from "@/lib/form-draft-utils";
import { Check, Copy } from "lucide-react";
import { buildContentShareUrl } from "@/lib/public-video-url";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { EventChannelModal } from "./event-channel-modal";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";

interface ChannelModalProps {
  open: boolean;
  onClose: () => void;
  channels: EventRoomVideoChannel[];
  isHost: boolean;
  eventId: string;
  frameId: string;
  liveVideoLink: string;
  eventEventType?: string;
  seedDraftId?: string | null;
  resumeSurface?: DraftResumeOrigin["surface"];
  onChannelCreated?: (channel: EventRoomVideoChannel) => void;
}

export const SelectDefaultVideoModal = ({
  open,
  onClose,
  channels,
  isHost,
  eventId,
  frameId,
  liveVideoLink,
  eventEventType,
  seedDraftId,
  resumeSurface = "content_room_settings",
  onChannelCreated,
}: ChannelModalProps) => {
  void frameId;
  const { handleAuthRequiredError, HostAuthModal } = useHostCapabilityWithAuth({
    cohostEventId: eventId,
  });

  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(
    channels.find(c => c.isDefault)?.id ?? null
  );
  const [updatingDefault, setUpdatingDefault] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setDefaultChannelId(channels.find(c => c.isDefault)?.id ?? null);
  }, [channels]);

  const handleSetDefaultChannel = async (channelId: string) => {
    setUpdatingDefault(true);

    try {
      const res = await updateDefaultChannel(eventId, channelId);
      if (!res.success) {
        if (
          handleAuthRequiredError(
            res,
            () => void handleSetDefaultChannel(channelId)
          )
        ) {
          return;
        }
        toast.error(res.message ?? "Failed to set default channel");
        return;
      }

      setDefaultChannelId(channelId);
      toast.success("Default channel updated!");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to set default channel");
      }
    } finally {
      setUpdatingDefault(false);
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (channelId: string) => {
    try {
      await navigator.clipboard.writeText(
        buildContentShareUrl({ eventId, channelId })
      );
      setCopiedId(channelId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Frame link copied");
    } catch {
      console.error("Failed to copy link");
    }
  };

  const [channelModalOpen, setChannelModalOpen] = useState(false);

  return (
    <>
      {HostAuthModal}
      <Dialog
        open={open}
        onOpenChange={onClose}
      >
        <DialogContent className="max-h-[70vh] w-full max-w-xs overflow-y-scroll">
          <h2 className="text-xl font-medium">
            Select default video for your channel
          </h2>

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">
              Select a default video to stream
            </p>

            <button
              type="button"
              className="cursor-pointer rounded-md bg-black p-2 text-white"
              onClick={() => setChannelModalOpen(true)}
            >
              Add video
            </button>
          </div>

          <EventChannelModal
            open={channelModalOpen}
            onClose={() => setChannelModalOpen(false)}
            isHost={isHost}
            eventId={eventId}
            eventEventType={eventEventType}
            seedDraftId={seedDraftId}
            resumeSurface={resumeSurface}
            onChannelCreated={channel => {
              onChannelCreated?.(channel);
            }}
          />

          <div className="text-sm">{liveVideoLink}</div>

          {channels.map(channel => (
            <div
              key={channel.id}
              className="border-primary flex items-center gap-2 rounded-md border-2 p-4 leading-relaxed"
            >
              <Checkbox
                checked={defaultChannelId === channel.id}
                onCheckedChange={() => handleSetDefaultChannel(channel.id)}
                disabled={!isHost || updatingDefault}
              />
              <span className="text-sm">{channel.title}</span>
              {copiedId === channel.id ? (
                <Check className="size-4" />
              ) : (
                <Copy
                  onClick={() => handleCopy(channel.id)}
                  className="size-4 shrink-0 cursor-pointer"
                />
              )}
              {defaultChannelId === channel.id && (
                <span className="ml-2 text-sm text-green-600">Default</span>
              )}
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
};
