"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import type {
  HostCreatorCommunity,
  HostCreatorEvent,
} from "@/actions/host-creator";
import { listHostTipLinksAction, type TipLinkSummary } from "@/actions/tiplink";
import { listMyVideosForVideoRequestsAction } from "@/actions/video-requests";
import { useTipLinkProfileCreate } from "@/hooks/use-tip-link-profile-create";
import { buildTipLinkManageHref } from "@/lib/tiplink-manage-navigation";
import {
  mapVideosByEventToHostCreatorEvents,
  type VideosByEventRow,
} from "@/lib/tiplink-eligible-videos";
import type { HostSubscriptionPromptFns } from "@/hooks/use-host-subscription-prompt";

type Options = {
  subscriptionPrompt?: HostSubscriptionPromptFns;
};

const EMPTY_COMMUNITIES: HostCreatorCommunity[] = [];

export function useTipLinkDashboardCreate(
  hostEventSlug: string | null,
  options?: Options
) {
  const router = useRouter();
  const [events, setEvents] = useState<HostCreatorEvent[]>([]);
  const [tipLinks, setTipLinks] = useState<TipLinkSummary[]>([]);
  const [pickerDataLoading, setPickerDataLoading] = useState(false);
  const [pickerDataError, setPickerDataError] = useState<string | null>(null);

  const onDraftCreated = useCallback(
    (draft: TipLinkSummary) => {
      if (!hostEventSlug) {
        toast.error("Could not open TipLink editor");
        return;
      }
      router.push(
        buildTipLinkManageHref(
          hostEventSlug,
          draft.eventId,
          draft.eventChannelId
        )
      );
    },
    [hostEventSlug, router]
  );

  const buildSubscriptionResumeReturnPath = useCallback(
    (video: { eventId: string; channelId: string }) => {
      if (hostEventSlug && video.eventId) {
        return buildTipLinkManageHref(
          hostEventSlug,
          video.eventId,
          video.channelId
        );
      }
      if (typeof window === "undefined") return "/";
      return `${window.location.pathname}${window.location.search}`;
    },
    [hostEventSlug]
  );

  const profileCreate = useTipLinkProfileCreate({
    events,
    communities: EMPTY_COMMUNITIES,
    tipLinks,
    isOwnProfile: true,
    onDraftCreated,
    buildSubscriptionResumeReturnPath,
    subscriptionPrompt: options?.subscriptionPrompt,
  });

  useEffect(() => {
    if (!profileCreate.pickerOpen) return;

    let cancelled = false;
    setPickerDataLoading(true);
    setPickerDataError(null);

    void (async () => {
      try {
        const [linksRes, videosRes] = await Promise.all([
          listHostTipLinksAction(),
          listMyVideosForVideoRequestsAction(),
        ]);
        if (cancelled) return;

        if (!linksRes.success || !linksRes.data) {
          setPickerDataError(
            linksRes.message ?? "Could not load your TipLinks."
          );
          return;
        }
        if (!videosRes.success || !videosRes.data) {
          setPickerDataError(
            videosRes.message ?? "Could not load eligible videos."
          );
          return;
        }

        setTipLinks(linksRes.data.tipLinks);
        const raw =
          (videosRes.data as { events?: VideosByEventRow[] }).events ?? [];
        setEvents(mapVideosByEventToHostCreatorEvents(raw, hostEventSlug));
      } finally {
        if (!cancelled) setPickerDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hostEventSlug, profileCreate.pickerOpen]);

  const openPicker = useCallback(() => {
    profileCreate.setPickerOpen(true);
  }, [profileCreate]);

  return {
    ...profileCreate,
    openPicker,
    pickerDataLoading,
    pickerDataError,
  };
}
