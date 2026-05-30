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
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronDown, Tv } from "lucide-react";

import { useMediaQuery } from "react-responsive";

import { Channel } from "@/types/channel.types";

import {
  getAllEventChannels,
  getAllTopTippers,
  getEventByIdAction,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import {
  getMeJoinedCommunitiesAction,
  getCommunityTipFeedAction,
} from "@/actions/communities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getLatestContents,
  getMostTippedContents,
  getTipFeed,
} from "@/actions/contents";
import { getAllCausesAction } from "@/actions/home";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useTV } from "../tv-provider";
import { RootState } from "@/redux/store";
import { useSideChick } from "@/components/community/side-chick-provider";
import { setSelectedTips } from "@/features/tip-slice";
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
} from "@/lib/tv-tip-feed-utils";
import type { RoomCharacter } from "@/types";
import { scheduleExploreFeedPrefetchIdle } from "@/lib/explore-feed-prefetch-cache";
import { TVPageClient } from "@/components/tv/tv-page-client";
import {
  TvInteractiveShell,
  type TvTipFeedMessage,
} from "./tv-interactive-shell";
import { TvWebExperience } from "./tv-web-experience";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";

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
  characterSets,
}: Props) {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const searchParams = useSearchParams();
  const router = useRouter();
  const communityFeatureOn =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";
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
    setScheduleSourceCommunityId,
    scheduleSourceCommunityId,
  } = useTV();

  const [tvPickerOpen, setTvPickerOpen] = useState(false);
  const [tvPickerOptions, setTvPickerOptions] = useState<
    { id: string; name: string }[]
  >([]);

  const sideChick = useSideChick();
  const tvSideChickLocked =
    !sideChick.loading &&
    Boolean(sideChick.active && sideChick.activation?.communityId) &&
    communityFeatureOn;

  useEffect(() => {
    if (!tvSideChickLocked || !sideChick.activation?.communityId) return;
    const id = sideChick.activation.communityId;
    const videoId = searchParams.get("videoId");
    if (videoId) return;
    setScheduleSourceCommunityId(id);
    try {
      localStorage.setItem("tipmanna-tv-community-id", id);
    } catch {
      /* ignore */
    }
    setTvPickerOpen(false);
    router.replace(`/tv?community=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }, [
    tvSideChickLocked,
    sideChick.activation?.communityId,
    searchParams,
    setScheduleSourceCommunityId,
    router,
  ]);

  const fetchTvPickerMemberships = useCallback(async () => {
    if (!userId) {
      setTvPickerOptions([]);
      return;
    }
    const r = await getMeJoinedCommunitiesAction();
    if (!r.success || !Array.isArray(r.data?.memberships)) return;
    const rows = r.data.memberships as {
      communityId: string;
      active: boolean;
      membershipStatus: string;
      revokedAt: string | null;
      expiresAt: string | null;
      community?: {
        name?: string;
        tvActivatedAt?: string | null;
        tvHostPaused?: boolean | null;
      };
    }[];
    const opts = rows
      .filter(m => {
        if (!m.active || m.revokedAt) return false;
        if (m.membershipStatus !== "active") return false;
        if (m.expiresAt && new Date(m.expiresAt) <= new Date()) return false;
        return (
          Boolean(m.community?.tvActivatedAt) && !m.community?.tvHostPaused
        );
      })
      .map(m => ({
        id: m.communityId,
        name: m.community?.name ?? m.communityId,
      }));
    setTvPickerOptions(opts);
  }, [userId]);

  useEffect(() => {
    if (communityFeatureOn) void fetchTvPickerMemberships();
  }, [communityFeatureOn, fetchTvPickerMemberships]);

  useEffect(() => {
    const videoId = searchParams.get("videoId");
    if (videoId) {
      setScheduleSourceCommunityId(null);
      setTvPickerOpen(false);
      return;
    }
    if (tvSideChickLocked && sideChick.activation?.communityId) {
      return;
    }
    const fromQuery = searchParams.get("community")?.trim();
    if (fromQuery) {
      setScheduleSourceCommunityId(fromQuery);
      try {
        localStorage.setItem("tipmanna-tv-community-id", fromQuery);
      } catch {
        /* ignore */
      }
      setTvPickerOpen(false);
      return;
    }
    try {
      const stored = localStorage.getItem("tipmanna-tv-community-id")?.trim();
      if (stored) {
        setScheduleSourceCommunityId(stored);
        router.replace(`/tv?community=${encodeURIComponent(stored)}`, {
          scroll: false,
        });
        setTvPickerOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setScheduleSourceCommunityId(null);
  }, [
    communityFeatureOn,
    fetchTvPickerMemberships,
    router,
    searchParams,
    setScheduleSourceCommunityId,
    tvSideChickLocked,
    sideChick.activation?.communityId,
  ]);

  const openTvSourcePicker = useCallback(() => {
    setTvPickerOpen(true);
    void fetchTvPickerMemberships();
  }, [fetchTvPickerMemberships]);

  const pickTipmanna = () => {
    try {
      localStorage.removeItem("tipmanna-tv-community-id");
    } catch {
      /* ignore */
    }
    setScheduleSourceCommunityId(null);
    router.replace("/tv", { scroll: false });
    setTvPickerOpen(false);
  };

  const pickCommunity = (id: string) => {
    try {
      localStorage.setItem("tipmanna-tv-community-id", id);
    } catch {
      /* ignore */
    }
    setScheduleSourceCommunityId(id);
    router.replace(`/tv?community=${encodeURIComponent(id)}`, {
      scroll: false,
    });
    setTvPickerOpen(false);
  };

  const dispatch = useDispatch();
  const selectedTips = useSelector((s: RootState) => s.tip.selectedTips);

  useEffect(() => {
    scheduleExploreFeedPrefetchIdle();
  }, []);

  const isMobile = useMediaQuery({ maxWidth: "500px" });

  const [activeTab, setActiveTab] = useState<"playlist" | "tips">("playlist");

  const handleSelectChannel = (index: number) => {
    playLocal(index);
  };

  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);
  const [isTVDrawerOpen, setIsTvDrawerOpen] = useState(false);

  const [drawerCharacters, setDrawerCharacters] = useState<Character[] | null>(
    null
  );
  const [drawerCharacterSets, setDrawerCharacterSets] = useState<
    CharacterSet[] | null
  >(null);

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
    currentScheduleItem?.defaultChannelEventId ??
    currentScheduleItem?.channel?.eventId ??
    "";

  const { openWalletModalNonce } = useWalletTopupTipResume(
    tipDrawerEventId || undefined,
    setIsTipDrawerOpen
  );

  const scheduleCommTvRef = useRef<string | null>(null);
  useEffect(() => {
    scheduleCommTvRef.current = scheduleSourceCommunityId;
  }, [scheduleSourceCommunityId]);

  useEffect(() => {
    let cancelled = false;
    if (!tipDrawerEventId) {
      setDrawerCharacters(null);
      setDrawerCharacterSets(null);
      return;
    }
    void (async () => {
      const res = await getEventByIdAction(tipDrawerEventId);
      if (cancelled) return;
      if (!res.success || !res.data) {
        setDrawerCharacters(null);
        setDrawerCharacterSets(null);
        return;
      }
      const rawSets = (res.data as { characterSets: CharacterSet[] })
        .characterSets;
      const sets: CharacterSet[] = Array.isArray(rawSets)
        ? rawSets.filter(
            (s: any) =>
              s && Array.isArray(s.characters) && s.characters.length > 0
          )
        : [];
      const flat: Character[] = sets.flatMap((set: any) =>
        set.characters.map((char: Character) => ({
          id: char.id,
          name: char.name,
          iconUrl: char.iconUrl,
          price: char.price,
          styleName: char.styleName,
        }))
      );
      setDrawerCharacterSets(sets.length ? sets : null);
      setDrawerCharacters(flat.length ? flat : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [tipDrawerEventId]);

  const tippingCharactersForDrawer = drawerCharacters ?? characters;
  const characterSetsForDrawer = drawerCharacterSets ?? characterSets;

  const videoTipKey = useMemo(
    () =>
      items.length > 0 && (currentScheduleItem?.id || tipDrawerEventId)
        ? `${currentIndex}:${currentScheduleItem?.id ?? ""}:${tipDrawerEventId}`
        : "",
    [items.length, currentIndex, currentScheduleItem?.id, tipDrawerEventId]
  );

  const prevVideoTipKeyRef = useRef("");

  useEffect(() => {
    if (!videoTipKey) return;
    if (prevVideoTipKeyRef.current === videoTipKey) return;
    const prev = prevVideoTipKeyRef.current;
    prevVideoTipKeyRef.current = videoTipKey;
    if (prev === "") return;
    dispatch(setSelectedTips([]));
  }, [videoTipKey, dispatch]);

  const nextTipEventId = useMemo(() => {
    if (items.length < 2) return "";
    const nextIdx = (currentIndex + 1) % items.length;
    const next = items[nextIdx];
    return next?.defaultChannelEventId ?? next?.channel?.eventId ?? "";
  }, [items, currentIndex]);

  const lastPreloadKeyRef = useRef("");

  useEffect(() => {
    if (!nextTipEventId || nextTipEventId === tipDrawerEventId) return;
    const key = `${currentIndex}:${nextTipEventId}`;
    if (lastPreloadKeyRef.current === key) return;
    lastPreloadKeyRef.current = key;

    const run = () => {
      void getEventByIdAction(nextTipEventId);
    };

    let cancel: () => void;
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(run, { timeout: 2_000 });
      cancel = () => cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(run, 0);
      cancel = () => clearTimeout(id);
    }
    return cancel;
  }, [nextTipEventId, tipDrawerEventId, currentIndex]);

  useEffect(() => {
    window.dispatchEvent(new Event("tv-page-open"));
  }, []);

  const [tipFeed, setTipFeed] = useState<TvTipFeedMessage[]>([]);
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
      const res = await getTipFeed();
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
        { data: _contents },
        { data: _latestContents },
        { data: _mostTippedContents },
      ] = await Promise.all([
        getAllTopTippers(),
        userId ? getTippedEventsForTipper() : Promise.resolve({ data: [] }),
        userId ? getTotalAmountTippedByTipper() : Promise.resolve({ data: 0 }),
        getAllCausesAction(),
        getAllEventChannels(),
        getLatestContents(),
        getMostTippedContents(),
      ]);

      if (cancelled) return;

      setTippers(Array.isArray(_tippers) ? _tippers : []);
      setTipperEvents(Array.isArray(_tipperEvents) ? _tipperEvents : []);
      setITipped(coalesceNumber(_iTipped));
      setCauses(Array.isArray(_causes) ? _causes : []);
      setContents(Array.isArray(_contents) ? _contents : []);
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
  }, [userId]);

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
  }, [scheduleSourceCommunityId]);

  useEffect(() => {
    if (scheduleSourceCommunityId) return;
    let cancelled = false;
    void (async () => {
      const res = await getTipFeed();
      if (cancelled) return;
      const raw = res?.data;
      if (Array.isArray(raw)) {
        setTipFeed(normalizeTipFeedList(raw));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleSourceCommunityId]);

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

  const tvSourceLabel = useMemo(() => {
    if (!scheduleSourceCommunityId) return "Tipmanna TV";
    return (
      tvPickerOptions.find(c => c.id === scheduleSourceCommunityId)?.name ??
      "Community TV"
    );
  }, [scheduleSourceCommunityId, tvPickerOptions]);

  const sharedShellProps = {
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
    tipFeed,
    scrollRef,
    scrollProgress,
    handleScroll,
    tipDrawerEventId,
    tippingCharactersForDrawer,
    characterSetsForDrawer,
    openWalletModalNonce,
    onSnapshotPaymentRedirect: snapshotPlaybackForPaymentRedirect,
    tvInlineSourceOptions: tvPickerOptions,
    tvInlineSourceCommunityId: scheduleSourceCommunityId,
    onTvInlineSourceChange: (id: string | null) => {
      if (id) pickCommunity(id);
      else pickTipmanna();
    },
    tvInlineSourceLocked: tvSideChickLocked,
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

      {communityFeatureOn &&
      !searchParams.get("videoId") &&
      !tvSideChickLocked ? (
        <div className="flex justify-end px-2 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="h-8 gap-1 px-2 text-xs"
                aria-label="Change TV source"
              >
                <Tv className="size-3.5" />
                <span className="max-w-[140px] truncate">{tvSourceLabel}</span>
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={pickTipmanna}>
                Tipmanna TV (global)
              </DropdownMenuItem>
              {tvPickerOptions.map(c => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => pickCommunity(c.id)}
                >
                  {c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild>
                <Link href="/community">Community hub</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openTvSourcePicker}>
                All TV sources…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

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
        <div className="mt-14">
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
