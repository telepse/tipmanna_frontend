"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import type {
  HostCreatorCommunity,
  HostCreatorEvent,
} from "@/actions/host-creator";
import {
  createTipLinkDraftAction,
  getTipLinkCreateEligibilityAction,
  listHostTipLinksAction,
  suggestTipLinkSlugAction,
  type TipLinkSummary,
} from "@/actions/tiplink";
import { getApprovedCommunityContentBankAction } from "@/actions/communities";
import { useHostCapabilityWithAuth } from "@/hooks/use-host-capability-with-auth";
import {
  useHostSubscriptionPrompt,
  type HostSubscriptionPromptFns,
} from "@/hooks/use-host-subscription-prompt";
import {
  listTipLinkEligibleCommunityBankVideos,
  listTipLinkEligibleEvents,
  type TipLinkPickerVideo,
} from "@/lib/tiplink-eligible-videos";
import { mergeCommunityBankRefreshResult } from "@/lib/tiplink-community-bank-refresh";
import { setHostSubscriptionResume } from "@/lib/host-subscription-resume";
import {
  openTipLinkCreateSubscriptionPrompt,
  tipLinkCreateBlockedMessage,
  TIPLINK_DRAFT_CREATE_TOAST_ID,
} from "@/lib/tiplink-create-subscription-gate";

export function useTipLinkProfileCreate({
  events,
  communities,
  tipLinks,
  isOwnProfile,
  onDraftCreated,
  buildSubscriptionResumeReturnPath,
  subscriptionPrompt,
}: {
  events: HostCreatorEvent[];
  communities: HostCreatorCommunity[];
  tipLinks: TipLinkSummary[];
  isOwnProfile: boolean;
  /** Called after a draft is created (e.g. switch profile tab to List). */
  onDraftCreated?: (draft: TipLinkSummary) => void;
  /** Stripe resume destination when create is blocked (defaults to current URL). */
  buildSubscriptionResumeReturnPath?: (video: TipLinkPickerVideo) => string;
  subscriptionPrompt?: HostSubscriptionPromptFns;
}) {
  const { requestHostAuth, HostAuthModal } = useHostCapabilityWithAuth();
  const localPrompt = useHostSubscriptionPrompt({ focusTier: "premium" });
  const { handleSubscriptionActionError, openForRequired, openForLapsed } =
    subscriptionPrompt ?? localPrompt;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftTipLinks, setDraftTipLinks] = useState<TipLinkSummary[]>([]);
  const [creatingChannelId, setCreatingChannelId] = useState<string | null>(
    null
  );
  const [communityBankVideos, setCommunityBankVideos] = useState<
    TipLinkPickerVideo[]
  >([]);
  const [communityBankLoading, setCommunityBankLoading] = useState(false);

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

  const eligibleEvents = useMemo(
    () => listTipLinkEligibleEvents(events, tipLinks, draftTipLinks),
    [draftTipLinks, events, tipLinks]
  );

  const ownedCommunities = useMemo(
    () =>
      isOwnProfile ? communities : communities.filter(c => c.isOwnProfile),
    [communities, isOwnProfile]
  );

  useEffect(() => {
    if (!isOwnProfile) {
      setCommunityBankLoading(false);
      return;
    }
    // Keep last-good bank list while closed; revalidate only when open.
    if (!pickerOpen) {
      setCommunityBankLoading(false);
      return;
    }
    if (ownedCommunities.length === 0) {
      setCommunityBankVideos([]);
      setCommunityBankLoading(false);
      return;
    }

    let cancelled = false;
    setCommunityBankLoading(true);
    void (async () => {
      const results = await Promise.all(
        ownedCommunities.map(async community => {
          const res = await getApprovedCommunityContentBankAction(community.id);
          if (!res.success || !res.data) {
            return { ok: false as const, videos: [] as TipLinkPickerVideo[] };
          }
          return {
            ok: true as const,
            videos: listTipLinkEligibleCommunityBankVideos(
              community.id,
              community.name,
              res.data.approved,
              tipLinks,
              draftTipLinks,
              community.eventId
            ),
          };
        })
      );
      if (cancelled) return;
      const anySuccess = results.some(r => r.ok);
      const next = results.filter(r => r.ok).flatMap(r => r.videos);
      setCommunityBankVideos(prior =>
        mergeCommunityBankRefreshResult({ prior, next, anySuccess })
      );
      if (!anySuccess) {
        toast.error("Could not refresh community bank videos");
      }
      setCommunityBankLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [draftTipLinks, isOwnProfile, ownedCommunities, pickerOpen, tipLinks]);

  const createDraftForVideo = useCallback(
    (video: TipLinkPickerVideo) => {
      requestHostAuth(async () => {
        setCreatingChannelId(video.channelId);
        toast.info("Creating TipLink draft…", {
          toastId: TIPLINK_DRAFT_CREATE_TOAST_ID,
        });
        try {
          const eligRes = await getTipLinkCreateEligibilityAction();
          if (eligRes.success && eligRes.data && !eligRes.data.canCreate) {
            toast.dismiss(TIPLINK_DRAFT_CREATE_TOAST_ID);
            toast.info(tipLinkCreateBlockedMessage(eligRes.data));
            openTipLinkCreateSubscriptionPrompt({
              eligibility: eligRes.data,
              openForRequired,
              openForLapsed,
              focusTier: "premium",
            });
            if (typeof window !== "undefined") {
              const returnPath =
                buildSubscriptionResumeReturnPath?.(video) ??
                `${window.location.pathname}${window.location.search}`;
              setHostSubscriptionResume({
                kind: "create-tiplink-draft",
                returnPath,
                channelId: video.channelId,
                eventId: video.eventId,
                title: video.title,
              });
            }
            return;
          }

          const slugRes = await suggestTipLinkSlugAction(video.title);
          const slug =
            slugRes.success && slugRes.data ? slugRes.data.slug : "link";
          const res = await createTipLinkDraftAction({
            eventChannelId: video.channelId,
            slug,
          });
          if (!res.success || !res.data) {
            if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
              toast.dismiss(TIPLINK_DRAFT_CREATE_TOAST_ID);
              if (typeof window !== "undefined") {
                const returnPath =
                  buildSubscriptionResumeReturnPath?.(video) ??
                  `${window.location.pathname}${window.location.search}`;
                setHostSubscriptionResume({
                  kind: "create-tiplink-draft",
                  returnPath,
                  channelId: video.channelId,
                  eventId: video.eventId,
                  title: video.title,
                });
              }
              return;
            }
            toast.dismiss(TIPLINK_DRAFT_CREATE_TOAST_ID);
            toast.error(res.message ?? "Could not create TipLink draft");
            return;
          }
          const draft = res.data.tipLink;
          setDraftTipLinks(prev => {
            if (prev.some(t => t.id === draft.id)) return prev;
            return [draft, ...prev];
          });
          onDraftCreated?.(draft);
          toast.dismiss(TIPLINK_DRAFT_CREATE_TOAST_ID);
          toast.success("TipLink draft created");
          setPickerOpen(false);
          void refreshDrafts();
        } finally {
          setCreatingChannelId(null);
        }
      });
    },
    [
      buildSubscriptionResumeReturnPath,
      handleSubscriptionActionError,
      onDraftCreated,
      openForLapsed,
      openForRequired,
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
        source: "event_room",
      });
    },
    [createDraftForVideo, events]
  );

  return {
    pickerOpen,
    setPickerOpen,
    eligibleEvents,
    communityBankVideos,
    communityBankLoading,
    creatingChannelId,
    draftTipLinks,
    refreshDrafts,
    openPicker,
    createDraftForVideo,
    createDraftForChannelVideo,
    HostAuthModal,
    SubscriptionPromptModal: subscriptionPrompt
      ? null
      : localPrompt.SubscriptionPromptModal,
  };
}
