"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { ApiError } from "@/types/api-error.types";
import { createEventChannelAction } from "@/actions/events";
import { applyServerFormErrors } from "@/lib/form-error-mapper";
import { usePathname, useRouter } from "next/navigation";
import type { DraftResumeOrigin } from "@/lib/form-draft-utils";
import {
  AddVideoForm,
  buildCreateChannelPayload,
  type AddVideoFormValues,
} from "@/components/events/add-video-form";
import { clearModalFormDraft } from "@/hooks/use-modal-form-draft-restore";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { mapApiChannelToEventRoomRow } from "@/lib/event-room-channel-mapper";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";

interface ChannelModalProps {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  eventId: string;
  /** Parent event.eventType — shown next to “Same as event type” for video theme */
  eventEventType?: string;
  seedDraftId?: string | null;
  resumeSurface?: DraftResumeOrigin["surface"];
  /** Optimistic append before router.refresh reconciles server list. */
  onChannelCreated?: (channel: EventRoomVideoChannel) => void;
}

export const EventChannelModal = ({
  open,
  onClose,
  isHost,
  eventId,
  eventEventType,
  seedDraftId,
  resumeSurface = "event_channel_modal",
  onChannelCreated,
}: ChannelModalProps) => {
  const { handleAuthRequiredError, HostAuthModal } = useHostCapabilityWithAuth({
    cohostEventId: eventId,
  });
  const [loading, setLoading] = useState(false);
  const [addVideoForm, setAddVideoForm] =
    useState<UseFormReturn<AddVideoFormValues> | null>(null);
  const [modalDraftId, setModalDraftId] = useState<string | null>(null);

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

      const data = res.data as { message?: string; channel?: unknown };
      toast.success(data.message ?? "Event video added successfully");

      const mapped = mapApiChannelToEventRoomRow(data.channel);
      if (mapped) {
        onChannelCreated?.(mapped);
      }

      await clearModalFormDraft("room_add_video", eventId, modalDraftId);
      setModalDraftId(null);

      setLoading(false);
      void router.refresh();
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
