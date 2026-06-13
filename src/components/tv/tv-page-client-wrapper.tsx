/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * TV /tv page client wrapper.
 *
 * Legacy desktop browse-only layout (thumbnails + carousels) lived in `TVPageClient`.
 * It is preserved below as a commented block for a possible future “TV browse section”.
 * Current desktop uses `TvWebExperience`: same interactive features as mobile (looper,
 * tips, Stripe, schedule) with a full-width channel-style layout.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useMediaQuery } from "react-responsive";

import { Channel } from "@/types/channel.types";

import {
  getAllTopTippers,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import {
  getLatestContents,
  getMostTippedContents,
  getTipFeed,
} from "@/actions/contents";
import { getAllCausesAction } from "@/actions/home";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTV } from "../tv-provider";
import { RootState } from "@/redux/store";
import { useTvSourcePicker } from "./tv-source-picker-provider";
import { setSelectedTips } from "@/features/tip-slice";
import type { RoomCharacter } from "@/types";
import { scheduleExploreFeedPrefetchIdle } from "@/lib/explore-feed-prefetch-cache";
import { TVPageClient } from "@/components/tv/tv-page-client";
import {
  TvInteractiveShell,
  type TvInteractiveShellProps,
} from "./tv-interactive-shell";
import { TvWebExperience } from "./tv-web-experience";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import {
  acquireCommunityLiveTvChannel,
  acquireGlobalLiveTvChannel,
  releaseCommunityLiveTvChannel,
  releaseGlobalLiveTvChannel,
} from "@/hooks/use-global-tip-stream";
import {
  mergeTipFeedDeduped,
  normalizeTipFeedList,
  prependTipFeedDeduped,
  rawToTipFeedMessage,
  type TvTipFeedMessage,
} from "@/lib/tv-tip-feed-utils";
import { getCommunityTipFeedAction } from "@/actions/communities";
import {
  collectTvScheduleEventIds,
  getCachedTvEventCatalog,
  loadTvEventCatalog,
  prefetchTvEventCatalogs,
  type TvEventCatalog,
} from "@/lib/tv-event-catalog-cache";

interface Character {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
  styleName:
    | "Confetti"
    | "Pop and Shoot"
    | "Fall"
    | "Burst"
    | "Screen Shake"
    | "Luxurious"
    | "Float"
    | "Spin";
}

interface CharacterSet {
  id: string;
  name: string;
  characters: Character[];
}

interface Props {
  channels: Channel[];
  characters: Character[];
  characterSets: CharacterSet[];
}

export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("currentUser");
  if (saved) return JSON.parse(saved);

  const newUser = {
    id: `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: "anonymous" as const,
    username: "Anonymous User",
    isAuthenticated: false,
  };
  localStorage.setItem("currentUser", JSON.stringify(newUser));
  return newUser;
};

/** Coerce API JSON (number or numeric string) for server actions typed as unknown. */
const coalesceNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

export default function TVPageClientWrapper({
  channels,
  characters,
}: Props) {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const {
    items,
    totalDuration,
    currentIndex,
    mode,
    isReady: tvReady,
    goLive,
    playLocal,
    switchToLocal,
    preparePlaybackForTipDrawer,
    snapshotPlaybackForPaymentRedirect,
    resumeAfterPayment,
    scheduleError,
    scheduleStale,
    retryScheduleLoad,
    playingItemOverride,
    selectedTag,
    scheduleSourceCommunityId,
  } = useTV();

  const {
    communityFeatureOn,
    tvPickerOpen,
    setTvPickerOpen,
    tvPickerOptions,
    pickTipmanna,
    pickCommunity,
  } = useTvSourcePicker();

  const dispatch = useDispatch();
  const selectedTips = useSelector((s: RootState) => s.tip.selectedTips);

  useEffect(() => {
    scheduleExploreFeedPrefetchIdle();
  }, []);

  const isMobile = useMediaQuery({ maxWidth: "500px" });

  useEffect(() => {
    if (!isMobile) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMobile]);

  const [activeTab, setActiveTab] = useState<"playlist" | "tips">("playlist");

  const handleSelectChannel = (index: number) => {
    playLocal(index);
  };

  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);
  const [isTVDrawerOpen, setIsTvDrawerOpen] = useState(false);

  const prevTipDrawerOpen = useRef(false);
  const prevTipCountRef = useRef(0);

  useEffect(() => {
    const tipCount = selectedTips.length;
    if (isTipDrawerOpen && !prevTipDrawerOpen.current) {
      preparePlaybackForTipDrawer(tipCount > 0);
    } else if (!isTipDrawerOpen && prevTipDrawerOpen.current) {
      resumeAfterPayment();
    } else if (
      isTipDrawerOpen &&
      prevTipDrawerOpen.current &&
      tipCount > 0 &&
      prevTipCountRef.current === 0
    ) {
      preparePlaybackForTipDrawer(true);
    }
    prevTipDrawerOpen.current = isTipDrawerOpen;
    prevTipCountRef.current = tipCount;
  }, [
    isTipDrawerOpen,
    selectedTips.length,
    preparePlaybackForTipDrawer,
    resumeAfterPayment,
  ]);

  const currentScheduleItem = useMemo(
    () => (playingItemOverride ?? items[currentIndex]) || items[0],
    [items, currentIndex, playingItemOverride]
  );

  const tipDrawerEventId =
    currentScheduleItem?.channel?.eventId ??
    currentScheduleItem?.defaultChannelEventId ??
    "";

  const playingVideoKey = useMemo(() => {
    if (!tipDrawerEventId || items.length === 0) return "";
    return `${currentScheduleItem?.id ?? ""}:${currentScheduleItem?.channel?.id ?? ""}:${tipDrawerEventId}`;
  }, [
    tipDrawerEventId,
    items.length,
    currentScheduleItem?.id,
    currentScheduleItem?.channel?.id,
  ]);

  const { openWalletModalNonce } = useWalletTopupTipResume(
    tipDrawerEventId || undefined,
    setIsTipDrawerOpen
  );

  const scheduleCommTvRef = useRef<string | null>(null);
  useEffect(() => {
    scheduleCommTvRef.current = scheduleSourceCommunityId;
  }, [scheduleSourceCommunityId, tipDrawerEventId]);

  const [videoTipCatalog, setVideoTipCatalog] = useState<TvEventCatalog | null>(
    null
  );

  useEffect(() => {
    if (!playingVideoKey || !tipDrawerEventId) {
      setVideoTipCatalog(null);
      return;
    }

    setVideoTipCatalog(getCachedTvEventCatalog(tipDrawerEventId));

    let cancelled = false;
    void loadTvEventCatalog(tipDrawerEventId).then(catalog => {
      if (!cancelled) setVideoTipCatalog(catalog);
    });

    return () => {
      cancelled = true;
    };
  }, [playingVideoKey, tipDrawerEventId]);

  useEffect(() => {
    if (!items.length) return;
    prefetchTvEventCatalogs(collectTvScheduleEventIds(items, 24));
  }, [items]);

  const characterSetsForDrawer = (videoTipCatalog?.characterSets ?? []).filter(
    set => Array.isArray(set.characters) && set.characters.length > 0
  );

  const tippingCharactersForDrawer = (videoTipCatalog?.characters ??
    []) as RoomCharacter[];

  const prevPlayingVideoKeyRef = useRef("");

  useEffect(() => {
    if (!playingVideoKey) return;
    if (prevPlayingVideoKeyRef.current === playingVideoKey) return;
    const prev = prevPlayingVideoKeyRef.current;
    prevPlayingVideoKeyRef.current = playingVideoKey;
    if (prev === "") return;
    dispatch(setSelectedTips([]));
  }, [playingVideoKey, dispatch]);

  useEffect(() => {
    window.dispatchEvent(new Event("tv-page-open"));
  }, []);

  const [, setTipFeed] = useState<TvTipFeedMessage[]>([]);
  const [tippers, setTippers] = useState<any[]>([]);
  const [tipperEvents, setTipperEvents] = useState<any[]>([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [latestContents, setLatestContents] = useState<any[]>([]);
  const [mostTippedContents, setMostTippedContents] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchTipFeedFirst = async () => {
      if (scheduleCommTvRef.current) return;
      const res = await getTipFeed(tipDrawerEventId);
      setTipFeed(normalizeTipFeedList(res.data));
      if (cancelled) return;
      const raw = res?.data;
      if (Array.isArray(raw)) {
        setTipFeed(normalizeTipFeedList(raw));
      }
    };

    const fetchSecondaryData = async () => {
      const [
        { data: _tippers },
        { data: _tipperEvents },
        { data: _iTipped },
        { data: _causes },
        { data: _latestContents },
        { data: _mostTippedContents },
      ] = await Promise.all([
        getAllTopTippers(),
        userId ? getTippedEventsForTipper() : Promise.resolve({ data: [] }),
        userId ? getTotalAmountTippedByTipper() : Promise.resolve({ data: 0 }),
        getAllCausesAction(),
        getLatestContents(),
        getMostTippedContents(),
      ]);

      if (cancelled) return;

      setTippers(Array.isArray(_tippers) ? _tippers : []);
      setTipperEvents(Array.isArray(_tipperEvents) ? _tipperEvents : []);
      setITipped(coalesceNumber(_iTipped));
      setCauses(Array.isArray(_causes) ? _causes : []);
      setContents([]);
      setLatestContents(Array.isArray(_latestContents) ? _latestContents : []);
      setMostTippedContents(
        Array.isArray(_mostTippedContents) ? _mostTippedContents : []
      );
    };

    void fetchTipFeedFirst();
    void fetchSecondaryData();

    return () => {
      cancelled = true;
    };
  }, [tipDrawerEventId, userId]);

  /** Stable community-scoped tip feed — keyed on community id only, not current schedule item. */
  useEffect(() => {
    if (!scheduleSourceCommunityId) return;
    let cancelled = false;
    void (async () => {
      const res = await getCommunityTipFeedAction(scheduleSourceCommunityId);
      if (cancelled) return;
      if (res.success && res.data) {
        setTipFeed(normalizeTipFeedList(res.data));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleSourceCommunityId, tipDrawerEventId]);

  useEffect(() => {
    if (scheduleSourceCommunityId) return;
    let cancelled = false;
    void (async () => {
      const res = await getTipFeed(tipDrawerEventId);
      if (cancelled) return;
      const raw = res?.data;
      if (Array.isArray(raw)) {
        setTipFeed(normalizeTipFeedList(raw));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleSourceCommunityId, tipDrawerEventId]);

  const refetchCommunityTipFeed = useCallback(async () => {
    const communityId = scheduleCommTvRef.current;
    if (!communityId) return;
    const res = await getCommunityTipFeedAction(communityId);
    if (!res.success || !res.data) return;
    const incoming = normalizeTipFeedList(res.data);
    setTipFeed(prev => mergeTipFeedDeduped(prev, incoming));
  }, []);

  /** Community TV realtime — ref-counted channel shared with tv-provider schedule listener. */
  useEffect(() => {
    if (!scheduleSourceCommunityId) return;
    const ch = acquireCommunityLiveTvChannel(scheduleSourceCommunityId);
    if (!ch) return;

    const onNewMessage = (message: unknown) => {
      const msg = rawToTipFeedMessage(message);
      if (!msg) return;
      setTipFeed(prev => prependTipFeedDeduped(prev, msg));
    };

    const onLiveTip = (data: unknown) => {
      const msg = rawToTipFeedMessage(data);
      if (!msg) return;
      setTipFeed(prev => prependTipFeedDeduped(prev, msg));
    };

    const onScheduleUpdated = () => {
      void refetchCommunityTipFeed();
    };

    ch.bind("new-message", onNewMessage);
    ch.bind("live-tip", onLiveTip);
    ch.bind("tv-schedule-updated", onScheduleUpdated);

    return () => {
      ch.unbind("new-message", onNewMessage);
      ch.unbind("live-tip", onLiveTip);
      ch.unbind("tv-schedule-updated", onScheduleUpdated);
      releaseCommunityLiveTvChannel(scheduleSourceCommunityId);
    };
  }, [scheduleSourceCommunityId, refetchCommunityTipFeed]);

  const tagFilteredContents = selectedTag
    ? contents.filter(
        (content: any) =>
          content?.event?.eventType?.toLowerCase() === selectedTag.toLowerCase()
      )
    : contents;

  useEffect(() => {
    const channel = acquireGlobalLiveTvChannel();
    if (!channel) return;

    const onSubscriptionSucceeded = () => undefined;
    channel.bind("pusher:subscription_succeeded", onSubscriptionSucceeded);

    const handleLiveTip = (data: any) => {
      if (scheduleCommTvRef.current) return;
      const msg = rawToTipFeedMessage(data);
      if (!msg) return;
      setTipFeed(prev => prependTipFeedDeduped(prev, msg));
    };

    const handleNewMessage = (message: any) => {
      if (scheduleCommTvRef.current) return;
      const msg = rawToTipFeedMessage(message);
      if (!msg) return;
      setTipFeed(prev => prependTipFeedDeduped(prev, msg));
    };

    channel.bind("live-tip", handleLiveTip);
    channel.bind("new-message", handleNewMessage);

    return () => {
      channel.unbind("pusher:subscription_succeeded", onSubscriptionSucceeded);
      channel.unbind("live-tip", handleLiveTip);
      channel.unbind("new-message", handleNewMessage);
      releaseGlobalLiveTvChannel();
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(10);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollHeight - el.clientHeight;

    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }

    const progress = ((el.scrollTop || 0) / maxScroll) * 100;
    setScrollProgress(progress);
  };

  const sharedShellProps: Omit<TvInteractiveShellProps, "variant"> = {
    characters: characters as unknown as RoomCharacter[],
    tvReady,
    items,
    totalDuration,
    mode,
    goLive,
    switchToLocal,
    scheduleStale,
    scheduleError,
    retryScheduleLoad,
    activeTab,
    setActiveTab,
    handleSelectChannel,
    isTipDrawerOpen,
    setIsTipDrawerOpen,
    isTVDrawerOpen,
    setIsTvDrawerOpen,
    scrollRef,
    scrollProgress,
    handleScroll,
    tipDrawerEventId,
    tippingCharactersForDrawer,
    characterSetsForDrawer,
    videoTipKey: playingVideoKey,
    openWalletModalNonce,
    onSnapshotPaymentRedirect: snapshotPlaybackForPaymentRedirect,
  };

  return (
    <>
      <Dialog
        open={tvPickerOpen}
        onOpenChange={setTvPickerOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Which TV do you want to watch?</DialogTitle>
            <DialogDescription>
              Tipmanna TV is the global broadcast. Community TVs are available
              when you are a member of a community that has TV enabled by an
              admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={pickTipmanna}
            >
              Tipmanna TV (global)
            </Button>
            {tvPickerOptions.map(c => (
              <Button
                key={c.id}
                type="button"
                variant="secondary"
                onClick={() => pickCommunity(c.id)}
              >
                {c.name}
              </Button>
            ))}
            {communityFeatureOn ? (
              <Button
                asChild
                variant="outline"
              >
                <Link href="/community">Community hub</Link>
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {!isMobile && <TvWebExperience {...sharedShellProps} />}

      {isMobile && (
        <div className="w-full">
          <TvInteractiveShell
            {...sharedShellProps}
            variant="mobile"
          />
        </div>
      )}

      {/* Legacy desktop browse layout (thumbnail carousels). Set to true only for reference / future TV browse section; active /tv desktop uses TvWebExperience above. */}
      {false && (
        <div>
          <TVPageClient
            channels={channels}
            currentPlayingIndex={currentIndex}
            contents={contents}
            tippers={tippers}
            tipperEvents={tipperEvents}
            iTipped={iTipped}
            causes={causes}
            latestContents={latestContents}
            mostTippedContents={mostTippedContents}
            selectedTag={selectedTag}
            tagFilteredContents={tagFilteredContents}
          />
        </div>
      )}
    </>
  );
}
