"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import type { HostCreatorEvent } from "@/actions/host-creator";
import {
  createTipLinkDraftAction,
  listHostTipLinksAction,
  suggestTipLinkSlugAction,
  type TipLinkSummary,
} from "@/actions/tiplink";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import {
  listTipLinkEligibleVideos,
  type TipLinkPickerVideo,
} from "@/lib/tiplink-eligible-videos";

export function useTipLinkProfileCreate({
  events,
  tipLinks,
  isOwnProfile,
  onDraftCreated,
}: {
  events: HostCreatorEvent[];
  tipLinks: TipLinkSummary[];
  isOwnProfile: boolean;
  /** Called after a draft is created (e.g. switch profile tab to List). */
  onDraftCreated?: (draft: TipLinkSummary) => void;
}) {
  const { requestHostAuth, HostAuthModal } = useHostCapabilityWithAuth();
  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({ focusTier: "premium" });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftTipLinks, setDraftTipLinks] = useState<TipLinkSummary[]>([]);
  const [creatingChannelId, setCreatingChannelId] = useState<string | null>(
    null
  );

  const refreshDrafts = useCallback(() => {
    if (!isOwnProfile) {
      setDraftTipLinks([]);
      return;
    }
    void listHostTipLinksAction().then(res => {
      if (!res.success || !res.data) return;
      const publishedIds = new Set(tipLinks.map(t => t.id));
      setDraftTipLinks(
        res.data.tipLinks.filter(
          t => t.status === "draft" && !publishedIds.has(t.id)
        )
      );
    });
  }, [isOwnProfile, tipLinks]);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  const eligibleVideos = useMemo(
    () => listTipLinkEligibleVideos(events, tipLinks, draftTipLinks),
    [draftTipLinks, events, tipLinks]
  );

  const createDraftForVideo = useCallback(
    (video: TipLinkPickerVideo) => {
      requestHostAuth(async () => {
        setCreatingChannelId(video.channelId);
        toast.info("Creating TipLink draft…", {
          toastId: "tiplink-draft-create",
        });
        try {
          const slugRes = await suggestTipLinkSlugAction(video.title);
          const slug =
            slugRes.success && slugRes.data ? slugRes.data.slug : "link";
          const res = await createTipLinkDraftAction({
            eventChannelId: video.channelId,
            slug,
          });
          if (!res.success || !res.data) {
            if (handleSubscriptionActionError(res, { focusTier: "premium" }))
              return;
            toast.error(res.message ?? "Could not create TipLink draft");
            return;
          }
          const draft = res.data.tipLink;
          setDraftTipLinks(prev => {
            if (prev.some(t => t.id === draft.id)) return prev;
            return [draft, ...prev];
          });
          onDraftCreated?.(draft);
          toast.success("TipLink draft created");
          setPickerOpen(false);
          void refreshDrafts();
        } finally {
          setCreatingChannelId(null);
        }
      });
    },
    [
      handleSubscriptionActionError,
      onDraftCreated,
      refreshDrafts,
      requestHostAuth,
    ]
  );

  const openPicker = useCallback(() => setPickerOpen(true), []);

  const createDraftForChannelVideo = useCallback(
    (eventId: string, channelId: string, title: string) => {
      const event = events.find(e => e.id === eventId);
      createDraftForVideo({
        channelId,
        eventId,
        eventSlug: event?.eventSlug ?? null,
        title,
        url: event?.videos.find(v => v.id === channelId)?.url ?? "",
        thumb: null,
      });
    },
    [createDraftForVideo, events]
  );

  return {
    pickerOpen,
    setPickerOpen,
    eligibleVideos,
    creatingChannelId,
    draftTipLinks,
    refreshDrafts,
    openPicker,
    createDraftForVideo,
    createDraftForChannelVideo,
    HostAuthModal,
    SubscriptionPromptModal,
  };
}
