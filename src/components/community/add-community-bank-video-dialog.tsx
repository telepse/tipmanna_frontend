"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "react-toastify";

import { addCommunityVideoAction } from "@/actions/communities";
import {
  AddVideoForm,
  buildCreateChannelPayload,
  type AddVideoFormValues,
} from "@/components/events/add-video-form";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clearModalFormDraft } from "@/hooks/use-modal-form-draft-restore";
import type { DraftResumeOrigin } from "@/lib/form-draft-utils";
import { applyServerFormErrors } from "@/lib/form-error-mapper";
import { buildAddCommunityVideoSubscriptionResumePath } from "@/lib/add-community-video-resume-path";
import { setHostSubscriptionResume } from "@/lib/host-subscription-resume";
import { ApiError } from "@/types/api-error.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  eventEventType?: string;
  hostSlug?: string;
  pathname?: string;
  seedDraftId?: string | null;
  onSuccess?: () => void;
};

export function AddCommunityBankVideoDialog({
  open,
  onOpenChange,
  communityId,
  eventEventType,
  hostSlug = "",
  pathname,
  seedDraftId: seedDraftIdProp = null,
  onSuccess,
}: Props) {
  const { handleAuthRequiredError, HostAuthModal } =
    useHostCapabilityWithAuth();
  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({ focusTier: "community" });
  const [addLoading, setAddLoading] = useState(false);
  const [addVideoForm, setAddVideoForm] =
    useState<UseFormReturn<AddVideoFormValues> | null>(null);
  const [modalDraftId, setModalDraftId] = useState<string | null>(
    seedDraftIdProp
  );

  const resumePathname =
    pathname?.trim() ||
    (hostSlug ? `/host/${hostSlug}/host-community` : "/host");

  const onAddVideo = async (values: AddVideoFormValues) => {
    try {
      const payload = buildCreateChannelPayload(values);
      const res = await addCommunityVideoAction(
        undefined,
        communityId,
        payload,
        { useHostSession: true }
      );
      if (!res.success) {
        if (
          handleAuthRequiredError(res, () => {
            void onAddVideo(values);
          })
        ) {
          return;
        }
        if (
          handleSubscriptionActionError(res, {
            focusTier: "community",
            toastFallback: false,
          })
        ) {
          setHostSubscriptionResume({
            kind: "return-path",
            returnPath: buildAddCommunityVideoSubscriptionResumePath(
              resumePathname,
              communityId
            ),
          });
          return;
        }
        if (addVideoForm) {
          applyServerFormErrors(
            addVideoForm,
            res.validationBody ?? { message: res.message }
          );
        } else {
          toast.error(res.message ?? "Failed to add video");
        }
        return;
      }
      toast.success(
        (res.data as { message?: string })?.message ?? "Video saved"
      );
      await clearModalFormDraft("community_video", communityId, modalDraftId);
      setModalDraftId(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      if (e instanceof Error) toast.error(e.message);
      else if (typeof e === "object" && e !== null && "error" in e) {
        toast.error((e as ApiError).error.message);
      } else toast.error("Failed to add video");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <>
      {HostAuthModal}
      {SubscriptionPromptModal}
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add video to community bank</DialogTitle>
          </DialogHeader>
          <AddVideoForm
            onSubmit={onAddVideo}
            onSubmitStart={() => setAddLoading(true)}
            loading={addLoading}
            eventEventType={eventEventType}
            showHostYoutubeSlot
            requirePolicyFields
            onFormReady={setAddVideoForm}
            onDraftIdChange={setModalDraftId}
            draftAutosave={{
              kind: "community_video",
              targetId: communityId,
              enabled: true,
              resumeOrigin: {
                surface: "host_community",
                pathname: resumePathname,
                targetId: communityId,
              } satisfies DraftResumeOrigin,
            }}
            seedDraftId={seedDraftIdProp}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
