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
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import {
  AddVideoForm,
  buildCreateChannelPayload,
  type AddVideoFormValues,
} from "@/components/events/add-video-form";
import { clearModalFormDraft } from "@/hooks/use-modal-form-draft-restore";
import { buildChannelShareUrl } from "@/lib/public-video-url";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

interface ChannelModalProps {
  open: boolean;
  onClose: () => void;
  channels: EventRoomVideoChannel[];
  isHost: boolean;
  eventId: string;
  frameId: string;
  liveVideoLink: string;
  /** Parent event.eventType — shown next to “Same as event type” for video theme */
  eventEventType?: string;
}

export const EventChannelModal = ({
  open,
  onClose,
  channels,
  isHost,
  eventId,
  frameId,
  liveVideoLink,
  eventEventType,
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
        buildChannelShareUrl({ eventId, channelId })
      );
      setCopiedId(channelId);
      setTimeout(() => setCopiedId(null), 2000);

      toast.success("Frame link copied");
    } catch {
      console.error("Failed to copy link");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="sm:max-w-nd max-h-[70vh] w-full overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>Add Channel Videos</DialogTitle>
        </DialogHeader>

        <AddVideoForm
          onSubmit={onSubmit}
          loading={loading}
          eventEventType={eventEventType}
          showHostYoutubeSlot
          requirePolicyFields
          onFormReady={setAddVideoForm}
          onDraftIdChange={setModalDraftId}
          draftAutosave={{
            kind: "room_add_video",
            targetId: eventId,
            enabled: isHost,
          }}
          belowSubmit={
            <>
              <div className="text-sm">{liveVideoLink}</div>

              {channels.map(channel => (
                <div
                  key={channel.id}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    checked={defaultChannelId === channel.id}
                    onCheckedChange={() => handleSetDefaultChannel(channel.id)}
                    disabled={!isHost || updatingDefault}
                  />
                  {channel.title}{" "}
                  {copiedId === channel.id ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy
                      onClick={() => handleCopy(channel.id)}
                      className="size-4"
                    />
                  )}
                  {defaultChannelId === channel.id && (
                    <span className="ml-2 text-sm text-green-600">Default</span>
                  )}
                </div>
              ))}
            </>
          }
        />
      </DialogContent>
    </Dialog>
  );
};
