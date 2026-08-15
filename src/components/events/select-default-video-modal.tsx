"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { ApiError } from "@/types/api-error.types";
import {
  createEventChannelAction,
  updateDefaultChannel,
} from "@/actions/events";
import { applyServerFormErrors } from "@/lib/form-error-mapper";
import { Checkbox } from "@/components/ui/checkbox";
import { usePathname, useRouter } from "next/navigation";
import type { DraftResumeOrigin } from "@/lib/form-draft-utils";
import { Check, Copy } from "lucide-react";
import {
  AddVideoForm,
  buildCreateChannelPayload,
  type AddVideoFormValues,
} from "@/components/events/add-video-form";
import { clearModalFormDraft } from "@/hooks/use-modal-form-draft-restore";
import { buildContentShareUrl } from "@/lib/public-video-url";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { EventChannelModal } from "./event-channel-modal";

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
}: ChannelModalProps) => {
  void frameId;
  const [loading, setLoading] = useState(false);
  const [addVideoForm, setAddVideoForm] =
    useState<UseFormReturn<AddVideoFormValues> | null>(null);
  const [modalDraftId, setModalDraftId] = useState<string | null>(null);

  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(
    channels.find(c => c.isDefault)?.id || null
  );
  const [updatingDefault, setUpdatingDefault] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const onSubmit = async (values: AddVideoFormValues) => {
    try {
      setLoading(true);
      const payload = buildCreateChannelPayload(values);
      const res = await createEventChannelAction(payload, eventId);
      if (!res.success) {
        if (addVideoForm) {
          applyServerFormErrors(
            addVideoForm,
            res.validationBody ?? { message: res.message }
          );
        } else {
          toast.error(res.message);
        }
        return;
      }

      const { message } = res.data as { message: string };

      toast.success(message);

      await clearModalFormDraft("room_add_video", eventId, modalDraftId);
      setModalDraftId(null);

      router.refresh();

      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to create event channel");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultChannel = async (channelId: string) => {
    setUpdatingDefault(true);

    try {
      await updateDefaultChannel(eventId, channelId);

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
            className="cursor-pointer rounded-md bg-black p-2 text-white"
            onClick={() => setChannelModalOpen(prev => !prev)}
          >
            Add video
          </button>
        </div>

        <EventChannelModal
          open={channelModalOpen}
          onClose={() => setChannelModalOpen(false)}
          channels={channels}
          isHost={isHost}
          eventId={eventId}
          frameId={frameId}
          liveVideoLink={liveVideoLink}
          eventEventType={eventEventType}
          seedDraftId={seedDraftId}
          resumeSurface="content_room_settings"
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
              className=""
            />
            <span className="text-sm">{channel.title}</span>{" "}
            {copiedId === channel.id ? (
              <Check className="size-4" />
            ) : (
              <Copy
                onClick={() => handleCopy(channel.id)}
                className="size-4 shrink-0"
              />
            )}
            {defaultChannelId === channel.id && (
              <span className="ml-2 text-sm text-green-600">Default</span>
            )}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
};
