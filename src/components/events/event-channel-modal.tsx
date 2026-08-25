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
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";

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
  seedDraftId?: string | null;
  resumeSurface?: DraftResumeOrigin["surface"];
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
  seedDraftId,
  resumeSurface = "event_channel_modal",
}: ChannelModalProps) => {
  void frameId;
  const { handleAuthRequiredError, HostAuthModal } = useHostCapabilityWithAuth({
    cohostEventId: eventId,
  });
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
        if (handleAuthRequiredError(res, () => void onSubmit(values))) {
          return;
        }
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

  return (
    <>
      {HostAuthModal}
      <Dialog
        open={open}
        onOpenChange={onClose}
      >
        <DialogContent className="sm:max-w-nd max-h-[70vh] w-full overflow-y-scroll">
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
              resumeOrigin: {
                surface: resumeSurface,
                pathname: pathname ?? `/room/${eventId}`,
                targetId: eventId,
              },
            }}
            seedDraftId={seedDraftId ?? modalDraftId}
            aboveForm={<></>}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
