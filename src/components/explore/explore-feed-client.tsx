/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Plus, Volume2, VolumeX } from "lucide-react";
import SignInDialog from "@/components/auth/sign-in-dialog";
import { useSelector } from "react-redux";

import {
  getContentChannelAction,
  getExploreChannelMetricsAction,
  postExploreFeedBatchAction,
  type ExploreChannelMetrics,
} from "@/actions/contents";
import {
  EXPLORE_FEED_BOOT_COUNT,
  takeExploreFeedBoot,
  waitExploreFeedPrefetch,
} from "@/lib/explore-feed-prefetch-cache";
import {
  persistExploreFeedSession,
  restoreExploreFeedSession,
  type ExploreFeedSessionKeyParams,
} from "@/lib/explore-feed-session-cache";
import VideoPlayer, {
  VideoPlayerRef,
  loadReelSoundPref,
} from "@/components/events/video-player";
import { CommunityCBadge } from "@/components/community/community-c-badge";
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { VideoFeatureCardBanner } from "@/components/video-feature/video-feature-card-banner";
import { useFeatureCardTipContext } from "@/components/video-feature/feature-card-tip-context";
import { Button } from "@/components/ui/button";
import { useAutoDropTip } from "@/hooks/use-auto-drop-tip";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";
import type { RoomCharacter } from "@/types";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  shutdownTvAnalyticsRuntime,
  setTvAnalyticsContext,
  trackTvVideoComplete,
  trackTvVideoEnd,
  trackTvVideoEncounter,
  trackTvVideoStart,
} from "@/lib/tvAnalytics";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import {
  scrollExploreFeedToIndex,
  getExploreSlideStepPx,
} from "@/lib/explore-feed-open";
import { cn } from "@/lib/utils";
import { ChannelProgressBar } from "@/components/events/channel-progress-bar";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { CreateDialog } from "@/components/home/create-dialog";
import { ImmersiveChannelActionsRail } from "@/components/events/immersive-channel-actions-rail";
import { TipsDrawer } from "@/components/events/tips-drawer";
import { getSavedVideosForTipper } from "@/actions/events";
import {
  formatSaveVideoError,
  isChannelSaved,
  normalizeSavedVideosList,
  toggleChannelSaveForUser,
} from "@/lib/save-video-client";
import { toast } from "react-toastify";
import type { RootState } from "@/redux/store";
import { trackTvSaveClick } from "@/lib/tvAnalytics";
import { buildChannelShareUrl } from "@/lib/public-video-url";
import { SaveHostToggleButton } from "@/components/events/save-host-toggle-button";
import { isYoutubeShortsUrl } from "@/lib/youtube-immersive-meta";

const TipDrawer = dynamic(
  () =>
    import("@/components/events/tip-drawer").then(m => ({
      default: m.TipDrawer,
    })),
  { ssr: false }
);

/**
 * Fixed slide height for snap scrolling. Explore stacks multiple chrome rows
 * (main header + tab strip + feed sub-toolbar); ~7.5rem keeps the stage aligned
 * with the visible flex region so the player stays visually centered.
 */
const SLIDE_VIEWPORT_LANDSCAPE =
  "h-[calc(100dvh-7.5rem)] min-h-[calc(100dvh-7.5rem)] max-md:h-[calc(100dvh-7rem)] max-md:min-h-[calc(100dvh-7rem)]";

/** Full-bleed portrait / Shorts slides use nearly the full viewport. */
const SLIDE_VIEWPORT_FULL_BLEED =
  "h-[calc(100dvh-4rem)] min-h-[calc(100dvh-4rem)]";

function exploreSlideViewportClass(
  videoUrl: string | null | undefined
): string {
  return isYoutubeShortsUrl(videoUrl)
    ? SLIDE_VIEWPORT_FULL_BLEED
    : SLIDE_VIEWPORT_LANDSCAPE;
}

/** Append size when near end of queue. */
const EXPLORE_FEED_PAGE_COUNT = 6;
/** Start loading before the last clip (stable scroll). */
const EXPLORE_NEAR_END_SLOTS = 3;
/** Mount players for previous slide + next N so clips buffer before scroll. */
const EXPLORE_PRELOAD_BEHIND = 0;
const EXPLORE_PRELOAD_AHEAD = 1;

function youtubePosterUrl(videoUrl: string): string | null {
  const id = extractYoutubeID(videoUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function ExploreReelScrubber({
  videoRef,
  active,
}: {
  videoRef: RefObject<VideoPlayerRef | null>;
  active: boolean;
}) {
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => {
      const p = videoRef.current;
      if (!p?.isReady()) return;
      setT(p.getCurrentTime());
      setDur(Math.max(0, p.getDuration()));
    }, 300);
    return () => window.clearInterval(id);
  }, [active, videoRef]);

  const safeDur = dur > 0 ? dur : 1;
  return (
    <div className="pointer-events-auto z-[92] w-full px-1">
      <input
        type="range"
        aria-label="Video position"
        min={0}
        max={safeDur}
        step={0.25}
        value={Math.min(t, safeDur)}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onChange={e => {
          const next = Number(e.target.value);
          const p = videoRef.current;
          if (!p?.isReady()) return;
          p.seekTo(next);
          setT(next);
        }}
        className="accent-primary h-0.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
      />
    </div>
  );
}

function isInExplorePreloadWindow(
  slideIndex: number,
  activeIndex: number,
  itemCount: number
) {
  const lo = Math.max(0, activeIndex - EXPLORE_PRELOAD_BEHIND);
  const hi = Math.min(itemCount - 1, activeIndex + EXPLORE_PRELOAD_AHEAD);
  return slideIndex >= lo && slideIndex <= hi;
}

type ExploreFeedSlideVideoProps = {
  item: any;
  slideIndex: number;
  activeIndex: number;
  activeIndexRef: MutableRefObject<number>;
  totalItems: number;
  feedSurfaceActive: boolean;
  videoRef: RefObject<VideoPlayerRef | null>;
  onActivePlaying: () => void;
  onActiveReelEnded?: () => void;
  onActiveReelMuteChange?: (muted: boolean) => void;
  onPlayerError?: () => void;
  playerRetryKey?: number;
  onEngageUnlocked?: () => void;
};

function ExploreFeedSlideVideo({
  item,
  slideIndex,
  activeIndex,
  activeIndexRef,
  totalItems,
  feedSurfaceActive,
  videoRef,
  onActivePlaying,
  onActiveReelEnded,
  onActiveReelMuteChange,
  onPlayerError,
  playerRetryKey = 0,
  onEngageUnlocked,
}: ExploreFeedSlideVideoProps) {
  const { aspectInfo, isLoading: aspectLoading } = useYoutubeVideoAspect(
    item.url
  );
  const presentationVideoSize = useMemo(() => {
    if (!aspectInfo || aspectInfo.width <= 0 || aspectInfo.height <= 0)
      return null;
    return { width: aspectInfo.width, height: aspectInfo.height };
  }, [aspectInfo]);

  const isFullBleed =
    aspectInfo?.classification === "portrait" ||
    aspectInfo?.classification === "square";

  const explorePresentationFit = useMemo<"contain" | "cover">(
    () => (isFullBleed ? "cover" : "contain"),
    [isFullBleed]
  );

  const playbackActive = feedSurfaceActive && slideIndex === activeIndex;

  const inPreloadBand = isInExplorePreloadWindow(
    slideIndex,
    activeIndex,
    totalItems
  );

  const [dwellOk, setDwellOk] = useState(false);
  useEffect(() => {
    if (!inPreloadBand) {
      setDwellOk(false);
      return undefined;
    }
    if (slideIndex === activeIndex) {
      setDwellOk(true);
      return undefined;
    }
    const tid = window.setTimeout(() => setDwellOk(true), 400);
    return () => window.clearTimeout(tid);
  }, [inPreloadBand, slideIndex, activeIndex]);

  const [engageUnlocked, setEngageUnlocked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseFlash, setPauseFlash] = useState<"play" | "pause" | null>(null);
  const pauseFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setIsPaused(false);
    setEngageUnlocked(false);
    if (pauseFlashTimeoutRef.current) {
      clearTimeout(pauseFlashTimeoutRef.current);
      pauseFlashTimeoutRef.current = null;
    }
    setPauseFlash(null);
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (pauseFlashTimeoutRef.current) {
        clearTimeout(pauseFlashTimeoutRef.current);
        pauseFlashTimeoutRef.current = null;
      }
    };
  }, []);

  const showPlayerMount =
    slideIndex === activeIndex || (inPreloadBand && dwellOk);
  const poster = youtubePosterUrl(typeof item.url === "string" ? item.url : "");

  const handleReelTap = () => {
    if (!playbackActive) return;
    if (!engageUnlocked) {
      setEngageUnlocked(true);
      onEngageUnlocked?.();
      const p = slideIndex === activeIndex ? videoRef.current : null;
      if (p?.isReady()) {
        p.unmute();
        onActiveReelMuteChange?.(false);
      }
      return;
    }
    const p = slideIndex === activeIndex ? videoRef.current : null;
    if (!p?.isReady()) return;
    if (isPaused) {
      p.play();
      setIsPaused(false);
      setPauseFlash("play");
    } else {
      p.pause();
      setIsPaused(true);
      setPauseFlash("pause");
    }
    if (pauseFlashTimeoutRef.current) {
      clearTimeout(pauseFlashTimeoutRef.current);
    }
    pauseFlashTimeoutRef.current = window.setTimeout(() => {
      pauseFlashTimeoutRef.current = null;
      setPauseFlash(null);
    }, 450);
  };

  return (
    <div
      data-testid="explore-video-shell"
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden ${isFullBleed ? "" : ""}`}
    >
      {item.community?.id && item.community?.name ? (
        <CommunityCBadge
          community={item.community}
          position="top-right"
        />
      ) : null}
      {showPlayerMount ? (
        <>
          {aspectLoading ? (
            <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black">
              <div className="aspect-video max-h-full w-full max-w-full animate-pulse bg-white/10 sm:max-w-[min(100%,520px)]" />
            </div>
          ) : null}
          <div
            className="absolute inset-0 z-30"
            onPointerDownCapture={e => {
              e.preventDefault();
              e.stopPropagation();
              handleReelTap();
            }}
            aria-hidden
          />
          {pauseFlash ? (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
              <span className="rounded-full bg-black/50 p-4 text-white">
                {pauseFlash === "pause" ? "❚❚" : "▶"}
              </span>
            </div>
          ) : null}
          <VideoPlayer
            key={`${item.id}-${playerRetryKey}`}
            ref={slideIndex === activeIndex ? videoRef : undefined}
            videoUrl={item.url}
            playbackActive={playbackActive}
            disableGlobalAudioUnlock
            suppressLoadingChrome={!playbackActive}
            loadingBackdropClassName="bg-black"
            showLoadingLabel={false}
            transitionLoadingOverlay={false}
            fullPresentationFit={explorePresentationFit}
            presentationVideoSize={presentationVideoSize}
            className={
              isFullBleed
                ? "min-h-0 min-w-0 flex-1"
                : "mt-16 min-h-0 min-w-0 flex-1 sm:mt-20"
            }
            onError={() => {
              if (slideIndex === activeIndex) onPlayerError?.();
            }}
            onMuteStateChange={
              playbackActive ? onActiveReelMuteChange : undefined
            }
            onPlayStateChange={playing => {
              if (slideIndex === activeIndex) setIsPaused(!playing);
              if (!playing) return;
              if (slideIndex !== activeIndexRef.current) return;
              onActivePlaying();
            }}
            onPlaybackEnded={() => {
              if (!feedSurfaceActive || slideIndex !== activeIndex) return;
              const scheduleItemId = `explore-${item.id}`;
              trackTvVideoComplete(scheduleItemId, {
                channelId: item.id,
                mode: "EXPLORE",
              });
              onActiveReelEnded?.();
            }}
          />
        </>
      ) : inPreloadBand ? (
        <div
          className={`relative flex min-h-[45vh] min-w-0 flex-1 items-center justify-center overflow-hidden bg-black ${isFullBleed ? "" : "mt-16 sm:mt-20"}`}
        >
          {/* Explore off-stage slides: YouTube poster (external CDN). */}
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- ytimg host; skip next/image remote config
            <img
              alt=""
              src={poster}
              className="h-full w-auto max-w-full object-contain opacity-90"
            />
          ) : (
            <p className="text-muted-foreground px-6 text-center text-sm">
              {item.title ?? "Clip"}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export interface ExploreFeedClientProps {
  characters: any[];
  characterSets: any[];
  /** When false (e.g. Discover tab visible), reel playback is paused. */
  feedSurfaceActive?: boolean;
  feedMode?: "trends" | "saves" | "community";
  /** Required for `feedMode="community"` batch requests (approved bank only). */
  communityIds?: string[];
  trendsFilters?: {
    eventTypes: string[];
    language: string;
    country: string;
  };
}

export type ExploreFeedClientHandle = {
  /**
   * Open a channel in the reel. `videoId` is the EventChannel / content row id
   * (Discover card `content.id`). Does not mutate `seedRef`.
   */
  openInExplore: (target: ExploreFeedOpenTarget) => Promise<void>;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
};

export const ExploreFeedClient = forwardRef<
  ExploreFeedClientHandle,
  ExploreFeedClientProps
>(function ExploreFeedClient(
  {
    characters,
    characterSets,
    feedSurfaceActive = true,
    feedMode = "trends",
    communityIds,
    trendsFilters = { eventTypes: [] as string[], language: "", country: "" },
  },
  ref
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const exploreReturnTo =
    typeof pathname === "string"
      ? `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`
      : "/explore";
  const [signInOpen, setSignInOpen] = useState(false);
  const [savesRefreshEpoch, setSavesRefreshEpoch] = useState(0);
  const videoRef = useRef<VideoPlayerRef>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const communityIdsKey = useMemo(
    () => [...(communityIds ?? [])].sort().join("|"),
    [communityIds]
  );
  const sessionKeyParams = useMemo<ExploreFeedSessionKeyParams>(
    () => ({
      feedMode,
      communityIds,
      trendsFilters,
    }),
    [feedMode, communityIdsKey, communityIds, trendsFilters]
  );
  const restoredSessionRef = useRef(
    typeof window !== "undefined"
      ? restoreExploreFeedSession({
          feedMode,
          communityIds,
          trendsFilters,
        })
      : null
  );
  const exploreBootRef = useRef<{ items: any[]; seed?: string } | null>(null);
  if (exploreBootRef.current === null) {
    const restored = restoredSessionRef.current;
    if (restored?.items.length) {
      exploreBootRef.current = {
        items: restored.items,
        seed: restored.seed,
      };
    } else {
      const useTrendsPrefetchBoot =
        feedMode === "trends" &&
        trendsFilters.eventTypes.length === 0 &&
        !trendsFilters.language?.trim() &&
        !trendsFilters.country?.trim();
      exploreBootRef.current = useTrendsPrefetchBoot
        ? takeExploreFeedBoot({ feedMode: "trends" })
        : feedMode === "saves"
          ? takeExploreFeedBoot({ feedMode: "saves" })
          : feedMode === "community"
            ? takeExploreFeedBoot({ feedMode: "community" })
            : { items: [], seed: undefined };
    }
  }
  const seedRef = useRef<string | undefined>(exploreBootRef.current.seed);
  const loadingMoreRef = useRef(false);
  const endOfFeedRef = useRef(false);
  const lastTrackedItemIdRef = useRef<string | null>(null);
  const segmentStartMsRef = useRef(0);
  const lastChannelIdRef = useRef<string | undefined>(undefined);

  const [items, setItems] = useState<any[]>(
    () => exploreBootRef.current!.items
  );
  const itemsRef = useRef<any[]>([]);
  itemsRef.current = items;
  const [activeIndex, setActiveIndex] = useState(
    () => restoredSessionRef.current?.activeIndex ?? 0
  );
  const [reelEngageUnlocked, setReelEngageUnlocked] = useState(false);
  const [playerRetryKey, setPlayerRetryKey] = useState(0);
  const [initialLoading, setInitialLoading] = useState(
    () => exploreBootRef.current!.items.length === 0
  );
  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exploreCommentOpen, setExploreCommentOpen] = useState(false);
  const [exploreCommentMetricsRefreshKey, setExploreCommentMetricsRefreshKey] =
    useState(0);
  const [tipsListOpen, setTipsListOpen] = useState(false);
  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [saveBusy, setSaveBusy] = useState(false);
  const [scrollSyncEpoch, setScrollSyncEpoch] = useState(0);
  const [reelMuted, setReelMuted] = useState(() => !loadReelSoundPref());

  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    const muted = !loadReelSoundPref();
    setReelMuted(muted);
    const tid = window.setTimeout(() => {
      videoRef.current?.setMuted(muted);
    }, 80);
    return () => window.clearTimeout(tid);
  }, [activeIndex]);

  const initialLoadingRef = useRef(initialLoading);
  initialLoadingRef.current = initialLoading;
  const pendingOpenRef = useRef<ExploreFeedOpenTarget | null>(null);
  const openingVideoIdRef = useRef<string | null>(null);
  const openGenerationRef = useRef(0);
  const scrollLayoutRetryRef = useRef(0);

  const active = items[activeIndex];
  const activeEventId = active?.event?.id ?? "";
  const activeChannelId = active?.id;

  const { setActiveVideoFeatureCardId } = useFeatureCardTipContext();

  useEffect(() => {
    setActiveVideoFeatureCardId(null);
  }, [activeChannelId, setActiveVideoFeatureCardId]);

  const refreshSavedContents = useCallback(async () => {
    if (!user) {
      setSavedContents([]);
      return;
    }
    const res = await getSavedVideosForTipper();
    if (res.success) {
      setSavedContents(normalizeSavedVideosList(res.data));
    }
  }, [user]);

  useEffect(() => {
    void refreshSavedContents();
  }, [refreshSavedContents]);

  useEffect(() => {
    const onSaves = () => void refreshSavedContents();
    window.addEventListener("tipmanna:saves-changed", onSaves);
    return () => window.removeEventListener("tipmanna:saves-changed", onSaves);
  }, [refreshSavedContents]);

  const saveExploreChannelId = activeChannelId ? String(activeChannelId) : null;
  const isExploreChannelSaved = saveExploreChannelId
    ? isChannelSaved(saveExploreChannelId, savedContents)
    : false;

  const handleExploreSaveToggle = useCallback(async () => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    if (!saveExploreChannelId) {
      toast.error("No video channel selected");
      return;
    }
    const wasSaved = isChannelSaved(saveExploreChannelId, savedContents);
    const prevList = savedContents;
    const placeholder = {
      channelId: saveExploreChannelId,
      channel: { id: saveExploreChannelId },
    };
    if (wasSaved) {
      setSavedContents(p =>
        p.filter(
          (s: { channelId?: string; channel?: { id?: string } }) =>
            String(s?.channelId ?? s?.channel?.id ?? "") !==
            saveExploreChannelId
        )
      );
    } else {
      setSavedContents(p => [...p, placeholder]);
    }
    try {
      setSaveBusy(true);
      const res = await toggleChannelSaveForUser({
        channelId: saveExploreChannelId,
        role: user?.role,
        userId: user?.id,
      });
      if (res.success && res.data) {
        toast.success(
          res.data.toggledTo === "saved"
            ? "Added video to saves"
            : "Removed video from saves"
        );
        if (res.data.toggledTo === "saved") {
          trackTvSaveClick(saveExploreChannelId);
        }
        setExploreCommentMetricsRefreshKey(k => k + 1);
        await refreshSavedContents();
      } else {
        setSavedContents(prevList);
        toast.error(res.error ?? res.message ?? "Failed to update save");
      }
    } catch (err: unknown) {
      setSavedContents(prevList);
      toast.error(formatSaveVideoError(err));
    } finally {
      setSaveBusy(false);
    }
  }, [
    refreshSavedContents,
    saveExploreChannelId,
    savedContents,
    user,
    user?.id,
    user?.role,
  ]);

  const [metrics, setMetrics] = useState<{
    encounters: number;
    completes: number;
    saves: number;
    shares: number;
    comments: number;
  } | null>(null);
  const [metricsRestrictedCommunity, setMetricsRestrictedCommunity] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!feedSurfaceActive) {
      setMetrics(null);
      setMetricsRestrictedCommunity(null);
      return;
    }
    const rawId = activeChannelId != null ? String(activeChannelId) : "";
    if (!rawId) {
      setMetrics(null);
      setMetricsRestrictedCommunity(null);
      return;
    }

    let cancelled = false;
    const probeTimer = window.setTimeout(() => {
      void (async () => {
        const r = await getExploreChannelMetricsAction(rawId);
        if (cancelled) return;
        if (r.success && r.data) {
          const d = r.data;
          if (
            typeof d === "object" &&
            d !== null &&
            "restricted" in d &&
            (d as { restricted?: boolean }).restricted === true
          ) {
            setMetrics(null);
            const c = (d as { community?: { id: string; name: string } })
              .community;
            setMetricsRestrictedCommunity(
              c?.id && c?.name ? { id: c.id, name: c.name } : null
            );
            return;
          }
          setMetricsRestrictedCommunity(null);
          setMetrics(d as ExploreChannelMetrics);
        } else {
          setMetrics(null);
          setMetricsRestrictedCommunity(null);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(probeTimer);
    };
  }, [activeChannelId, feedSurfaceActive]);
  const { openWalletModalNonce } = useWalletTopupTipResume(
    activeEventId || undefined,
    setIsTipDrawerOpen
  );
  const tipDrawerStripeMounted =
    isTipDrawerOpen || openWalletModalNonce > 0;
  const activeRef = useRef(active);
  activeRef.current = active;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    setReelEngageUnlocked(false);
  }, [activeIndex]);

  const handleExploreClipPlaying = useCallback(() => {
    const idx = activeIndexRef.current;
    const cur = activeRef.current;
    if (!cur) return;
    const scheduleItemId = `explore-${cur.id}`;
    if (lastTrackedItemIdRef.current !== scheduleItemId) {
      lastTrackedItemIdRef.current = scheduleItemId;
      segmentStartMsRef.current = Date.now();
      trackTvVideoEncounter(scheduleItemId, {
        channelId: cur.id,
        mode: "EXPLORE",
        scheduleIndex: idx,
      });
      trackTvVideoStart(scheduleItemId, "EXPLORE", idx, cur.id);
    }
  }, []);

  useEffect(() => {
    setExploreCommentOpen(false);
    setPlayerRetryKey(0);
  }, [activeIndex]);

  /** Scoped to visible Feed tab — avoids stray handlers while Discover is shown (feed subtree stays mounted under `hidden`). */
  useGlobalTipStream({
    eventId: activeEventId || undefined,
    enabled: feedSurfaceActive,
    surface: "explore_feed",
  });
  usePaymentAnimationPlayer({
    eventId: activeEventId,
    characters: characters as RoomCharacter[],
    enabled: feedSurfaceActive,
    surface: "explore_feed",
  });
  useAutoDropTip(activeEventId, Boolean(activeEventId) && feedSurfaceActive);

  const { amountRaised: liveAmountRaised, numOfTips: liveNumOfTips } =
    useEventRoomRealtime({
      eventId: activeEventId,
      initialAmountRaised: active?.event?.amountRaised ?? 0,
      initialNumOfTips: active?.event?.numOfTips ?? 0,
      enabled: Boolean(activeEventId) && feedSurfaceActive,
    });

  /** `null` = request failed (retry later). `[]` = success but no more items. */
  const [savesBlocked, setSavesBlocked] = useState<null | "auth" | "min_saves">(
    null
  );
  const savesBlockedRef = useRef(savesBlocked);
  savesBlockedRef.current = savesBlocked;

  const handleExplorePlayerError = useCallback(() => {
    setPlayerRetryKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    persistExploreFeedSession(sessionKeyParams, {
      items,
      seed: seedRef.current,
      activeIndex,
      scrollTop: scrollRef.current?.scrollTop,
    });
  }, [items, activeIndex, sessionKeyParams]);

  useEffect(() => {
    return () => {
      const curItems = itemsRef.current;
      if (curItems.length === 0) return;
      persistExploreFeedSession(sessionKeyParams, {
        items: curItems,
        seed: seedRef.current,
        activeIndex: activeIndexRef.current,
        scrollTop: scrollRef.current?.scrollTop,
      });
    };
  }, [sessionKeyParams]);

  useEffect(() => {
    const top = restoredSessionRef.current?.scrollTop;
    const root = scrollRef.current;
    if (top == null || !root) return;
    requestAnimationFrame(() => {
      root.scrollTop = top;
    });
  }, []);

  const fetchBatch = useCallback(
    async (list: any[], count: number) => {
      if (feedMode === "community" && !(communityIds?.length ?? 0)) {
        return [];
      }
      const r = await postExploreFeedBatchAction(
        list.map((x: any) => x.id),
        seedRef.current,
        count,
        undefined,
        {
          feedMode,
          ...(communityIds?.length ? { communityIds } : {}),
          eventVideoTypes: trendsFilters.eventTypes.length
            ? trendsFilters.eventTypes
            : undefined,
          language: trendsFilters.language?.trim()
            ? trendsFilters.language.trim()
            : undefined,
          country: trendsFilters.country?.trim()
            ? trendsFilters.country.trim()
            : undefined,
        }
      );
      if (!r.success || !r.data) {
        toast.error(r.error ?? r.message ?? "Could not load explore feed");
        return null;
      }
      if (feedMode === "saves" && r.data.savesFeedEligible === false) {
        setSavesBlocked(r.data.savesFeedReason ?? "auth");
        if (r.data.seed) seedRef.current = r.data.seed;
        return [];
      }
      setSavesBlocked(null);
      if (r.data.seed) seedRef.current = r.data.seed;
      return Array.isArray(r.data.items) ? (r.data.items as any[]) : [];
    },
    [
      feedMode,
      communityIds,
      trendsFilters.eventTypes,
      trendsFilters.language,
      trendsFilters.country,
    ]
  );

  useEffect(() => {
    if (feedMode !== "saves") return;
    const maybeReload = () => {
      const blk = savesBlockedRef.current;
      const n = itemsRef.current.length;
      if (blk === "auth" || (n === 0 && blk !== "min_saves")) {
        setSavesRefreshEpoch(e => e + 1);
      }
    };
    const onSavesChanged = () => maybeReload();
    const onVis = () => {
      if (document.visibilityState === "visible") maybeReload();
    };
    window.addEventListener("tipmanna:saves-changed", onSavesChanged);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("tipmanna:saves-changed", onSavesChanged);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [feedMode]);

  useEffect(() => {
    if (feedMode !== "saves" || savesRefreshEpoch === 0) return;
    let cancelled = false;
    void (async () => {
      endOfFeedRef.current = false;
      setSavesBlocked(null);
      const batch = await fetchBatch([], EXPLORE_FEED_BOOT_COUNT);
      if (cancelled) return;
      setItems(batch ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [savesRefreshEpoch, feedMode, fetchBatch]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "auto") => {
      const root = scrollRef.current;
      if (!root || itemsRef.current.length === 0) return;
      const h = getExploreSlideStepPx(root);
      if (h <= 0) return;
      const idx = Math.min(itemsRef.current.length - 1, Math.max(0, index));
      scrollExploreFeedToIndex(root, idx, behavior);
      setActiveIndex(prev => (prev === idx ? prev : idx));
    },
    []
  );

  useEffect(() => {
    const restored = restoredSessionRef.current;
    if (!restored || restored.activeIndex <= 0) return;
    const tid = window.setTimeout(() => {
      scrollToIndex(restored.activeIndex, "auto");
    }, 0);
    return () => window.clearTimeout(tid);
  }, [scrollToIndex]);

  const advanceReelAfterEnd = useCallback(() => {
    if (!feedSurfaceActive) return;
    const idx = activeIndexRef.current;
    if (idx >= itemsRef.current.length - 1) return;
    scrollToIndex(idx + 1, "smooth");
  }, [feedSurfaceActive, scrollToIndex]);

  const executeOpenInExplore = useCallback(
    async (target: ExploreFeedOpenTarget) => {
      const { videoId, eventId, channelSnapshot } = target;
      const myGen = ++openGenerationRef.current;
      scrollLayoutRetryRef.current = 0;
      openingVideoIdRef.current = videoId;

      const existingIdx = itemsRef.current.findIndex(i => i.id === videoId);
      if (existingIdx >= 0) {
        setScrollSyncEpoch(e => e + 1);
        return;
      }

      const snap =
        channelSnapshot &&
        typeof channelSnapshot === "object" &&
        String(channelSnapshot.id ?? "") === String(videoId) &&
        typeof channelSnapshot.url === "string" &&
        channelSnapshot.url.trim() !== "";

      if (snap) {
        const row = channelSnapshot as any;
        setItems(prev => {
          if (myGen !== openGenerationRef.current) return prev;
          if (openingVideoIdRef.current !== videoId) return prev;
          if (prev.some(i => i.id === videoId)) return prev;
          const ai = activeIndexRef.current;
          const insertAt = Math.min(ai + 1, prev.length);
          const next = [...prev];
          next.splice(insertAt, 0, row);
          return next;
        });
        if (myGen !== openGenerationRef.current) return;
        if (openingVideoIdRef.current !== videoId) return;
        setScrollSyncEpoch(e => e + 1);
        return;
      }

      const res = await getContentChannelAction(eventId);
      if (myGen !== openGenerationRef.current) return;
      if (!res.success || !Array.isArray(res.data)) {
        openingVideoIdRef.current = null;
        return;
      }
      const row = res.data.find((c: any) => c?.id === videoId);
      if (
        !row ||
        (typeof row.restricted === "boolean" && row.restricted) ||
        typeof row.url !== "string" ||
        !row.url.trim()
      ) {
        openingVideoIdRef.current = null;
        return;
      }

      setItems(prev => {
        if (myGen !== openGenerationRef.current) return prev;
        if (openingVideoIdRef.current !== videoId) return prev;
        if (prev.some(i => i.id === videoId)) return prev;
        const ai = activeIndexRef.current;
        const insertAt = Math.min(ai + 1, prev.length);
        const next = [...prev];
        next.splice(insertAt, 0, row);
        return next;
      });
      if (myGen !== openGenerationRef.current) return;
      if (openingVideoIdRef.current !== videoId) return;
      setScrollSyncEpoch(e => e + 1);
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      openInExplore: async (target: ExploreFeedOpenTarget) => {
        if (initialLoadingRef.current) {
          pendingOpenRef.current = target;
          return;
        }
        await executeOpenInExplore(target);
      },
      scrollToIndex,
    }),
    [executeOpenInExplore, scrollToIndex]
  );

  useEffect(() => {
    if (initialLoading) return;
    const p = pendingOpenRef.current;
    if (!p) return;
    pendingOpenRef.current = null;
    void executeOpenInExplore(p);
  }, [initialLoading, executeOpenInExplore]);

  useLayoutEffect(() => {
    let raf = 0;
    const vid = openingVideoIdRef.current;
    if (!vid) return;
    const idx = itemsRef.current.findIndex(i => i.id === vid);
    if (idx < 0) return;
    const root = scrollRef.current;
    if (!root) return;
    const h = getExploreSlideStepPx(root);
    if (h <= 0) {
      if (feedSurfaceActive && scrollLayoutRetryRef.current < 16) {
        scrollLayoutRetryRef.current += 1;
        raf = requestAnimationFrame(() => {
          setScrollSyncEpoch(e => e + 1);
        });
      }
      return () => cancelAnimationFrame(raf);
    }
    scrollLayoutRetryRef.current = 0;
    openingVideoIdRef.current = null;
    scrollExploreFeedToIndex(root, idx, "auto");
    setActiveIndex(prev => (prev === idx ? prev : idx));
    return () => cancelAnimationFrame(raf);
  }, [items, scrollSyncEpoch, feedSurfaceActive]);

  useEffect(() => {
    initTvAnalyticsRuntime();
  }, []);

  useEffect(() => {
    let cancelled = false;
    endOfFeedRef.current = false;
    setSavesBlocked(null);

    if (exploreBootRef.current!.items.length > 0) {
      setInitialLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      if (feedMode === "community" && (!(communityIds?.length ?? 0) || !user)) {
        setItems([]);
        setInitialLoading(false);
        return;
      }
      const warmed = await waitExploreFeedPrefetch();
      if (cancelled) return;
      if (
        feedMode === "trends" &&
        !(communityIds?.length ?? 0) &&
        trendsFilters.eventTypes.length === 0 &&
        !trendsFilters.language?.trim() &&
        !trendsFilters.country?.trim() &&
        warmed?.items?.length
      ) {
        seedRef.current = warmed.seed;
        setItems(warmed.items);
        setInitialLoading(false);
        return;
      }
      const batch = await fetchBatch([], EXPLORE_FEED_BOOT_COUNT);
      if (cancelled) return;
      setItems(batch ?? []);
      setInitialLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    fetchBatch,
    feedMode,
    communityIdsKey,
    communityIds?.length,
    trendsFilters.eventTypes,
    trendsFilters.language,
    trendsFilters.country,
    user,
  ]);

  useEffect(() => {
    if (endOfFeedRef.current) return;
    const len = itemsRef.current.length;
    if (len === 0 || activeIndex < len - EXPLORE_NEAR_END_SLOTS) return;
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    void (async () => {
      const batch = await fetchBatch(itemsRef.current, EXPLORE_FEED_PAGE_COUNT);
      loadingMoreRef.current = false;
      if (batch === null) return;
      if (batch.length === 0) {
        endOfFeedRef.current = true;
        return;
      }
      setItems(prev => {
        const seen = new Set(prev.map((x: any) => x.id));
        const out = [...prev];
        for (const it of batch) {
          if (it?.id && !seen.has(it.id)) {
            seen.add(it.id);
            out.push(it);
          }
        }
        return out;
      });
    })();
  }, [activeIndex, fetchBatch]);

  /** Same-height snap slides: derive active index from scroll (stable vs partial IntersectionObserver batches). */
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || items.length === 0) return;

    let raf = 0;
    const commitIndex = () => {
      raf = 0;
      const len = itemsRef.current.length;
      if (len === 0) return;
      const slide = root.querySelector(
        "[data-explore-slide]"
      ) as HTMLElement | null;
      const h = slide?.getBoundingClientRect().height ?? 0;
      if (h <= 0) return;
      const idx = Math.min(
        len - 1,
        Math.max(0, Math.round(root.scrollTop / h))
      );
      setActiveIndex(prev => (prev === idx ? prev : idx));
    };

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(commitIndex);
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    const supportsScrollEnd =
      typeof HTMLElement !== "undefined" &&
      "onscrollend" in HTMLElement.prototype;
    if (supportsScrollEnd) {
      root.addEventListener("scrollend", commitIndex, { passive: true });
    }

    const initial = requestAnimationFrame(commitIndex);

    return () => {
      cancelAnimationFrame(initial);
      if (raf) cancelAnimationFrame(raf);
      root.removeEventListener("scroll", onScroll);
      if (supportsScrollEnd) {
        root.removeEventListener("scrollend", commitIndex);
      }
    };
  }, [items.length]);

  useEffect(() => {
    const cur = items[activeIndex];
    if (!cur) return;

    void flushTvAnalytics().then(() => {
      const prevId = lastTrackedItemIdRef.current;
      if (prevId && segmentStartMsRef.current > 0) {
        const sec = (Date.now() - segmentStartMsRef.current) / 1000;
        trackTvVideoEnd(
          prevId,
          sec,
          "slot_change",
          "EXPLORE",
          lastChannelIdRef.current
        );
      }
      lastTrackedItemIdRef.current = null;
      segmentStartMsRef.current = 0;
      lastChannelIdRef.current = cur.id;

      const eventIdSafe = cur.event?.id;
      if (!eventIdSafe) return;

      setTvAnalyticsContext({
        eventId: eventIdSafe,
        channelId: cur.id,
        surface: feedMode === "community" ? "community_feed" : "explore_feed",
        communityId: cur.community?.id ? cur.community.id : null,
      });
    });
  }, [activeIndex, items, feedMode]);

  if (initialLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black text-white">
        Loading feed…
      </div>
    );
  }

  if (items.length === 0) {
    if (feedMode === "saves" && savesBlocked === "min_saves") {
      return (
        <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
          <p className="max-w-sm text-sm">
            Save at least three videos to unlock a personalised feed based on
            your saves.
          </p>
          <Button
            asChild
            variant="secondary"
          >
            <Link href="/explore?tab=discover">Browse Discover</Link>
          </Button>
        </div>
      );
    }
    if (feedMode === "saves" && savesBlocked === "auth") {
      return (
        <>
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
            <p className="max-w-sm text-sm">
              Sign in as a tipper to see your saves feed.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSignInOpen(true)}
            >
              Sign in
            </Button>
          </div>
          <SignInDialog
            open={signInOpen}
            onOpenChange={setSignInOpen}
            returnTo={exploreReturnTo}
          />
        </>
      );
    }
    if (feedMode === "community" && !user) {
      return (
        <>
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
            <p className="max-w-sm text-sm">
              Sign in to browse community clips in Explore.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSignInOpen(true)}
            >
              Sign in
            </Button>
          </div>
          <SignInDialog
            open={signInOpen}
            onOpenChange={setSignInOpen}
            returnTo={exploreReturnTo}
          />
        </>
      );
    }
    if (feedMode === "community" && !(communityIds?.length ?? 0)) {
      return (
        <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
          <p className="max-w-sm text-sm">
            Choose one or more communities from the menu above to load their
            public bank into this feed.
          </p>
          <Button
            asChild
            variant="secondary"
          >
            <Link href="/community">Manage communities</Link>
          </Button>
        </div>
      );
    }
    if (feedMode === "community") {
      return (
        <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
          <p className="max-w-sm text-sm">
            No approved clips from the selected communities right now. Try again
            later or pick different communities.
          </p>
          <Button
            asChild
            variant="secondary"
          >
            <Link href="/community">Communities</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p>No clips available to explore yet.</p>
        <Button
          asChild
          variant="secondary"
        >
          <Link href="/tv">Back to TV</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col bg-black">
      <div
        data-testid="explore-feed-scroll"
        ref={scrollRef}
        className={cn(
          "min-h-0 w-full max-w-[100vw] min-w-0 flex-1 touch-pan-y snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
          isTipDrawerOpen && "pointer-events-none select-none"
        )}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            data-explore-slide
            data-index={i}
            className={cn(
              "relative flex min-h-0 w-full max-w-[100vw] min-w-0 shrink-0 snap-start snap-always flex-col bg-black",
              exploreSlideViewportClass(
                typeof item.url === "string" ? item.url : null
              )
            )}
          >
            {isInExplorePreloadWindow(i, activeIndex, items.length) ? (
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden">
                <ExploreFeedSlideVideo
                  item={item}
                  slideIndex={i}
                  activeIndex={activeIndex}
                  activeIndexRef={activeIndexRef}
                  totalItems={items.length}
                  feedSurfaceActive={feedSurfaceActive}
                  videoRef={videoRef}
                  onActivePlaying={handleExploreClipPlaying}
                  onActiveReelEnded={advanceReelAfterEnd}
                  onActiveReelMuteChange={setReelMuted}
                  onPlayerError={handleExplorePlayerError}
                  playerRetryKey={playerRetryKey}
                  onEngageUnlocked={
                    i === activeIndex
                      ? () => setReelEngageUnlocked(true)
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center text-sm">
                {item.title}
              </div>
            )}

            {i === activeIndex ? (
              <>
                {activeChannelId != null &&
                process.env.NEXT_PUBLIC_VIDEO_REQUESTS_ENABLED !== "false" ? (
                  <div className="pointer-events-auto absolute top-14 left-3 z-[13100] max-w-[min(360px,calc(100vw-3rem))]">
                    <VideoFeatureCardBanner
                      surfaceChannelId={String(activeChannelId)}
                      hostSurfaceChannelId={String(activeChannelId)}
                      compact
                      onTipFeatured={id => {
                        setActiveVideoFeatureCardId(id);
                        setIsTipDrawerOpen(true);
                      }}
                    />
                  </div>
                ) : null}
                <div className="pointer-events-none absolute right-3 bottom-28 left-3 space-y-1 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold drop-shadow-md">
                    <button
                      type="button"
                      title={reelMuted ? "Unmute" : "Mute"}
                      className="cursor-pointer rounded bg-black/50 p-1"
                      onClick={e => {
                        e.stopPropagation();
                        const p = videoRef.current;
                        if (!p?.isReady()) return;
                        if (reelMuted) p.unmute();
                        else p.mute();
                        setReelMuted(!reelMuted);
                      }}
                    >
                      {reelMuted ? (
                        <VolumeX className="size-4 text-white" />
                      ) : (
                        <Volume2 className="size-4 text-white" />
                      )}
                    </button>{" "}
                    {item.title ?? item.event?.eventName}
                  </div>
                  {/* <div className="pointer-events-auto flex items-center gap-2">
                    <SaveHostToggleButton
                      channelId={
                        activeChannelId != null ? String(activeChannelId) : null
                      }
                      className="rounded bg-black/50 p-1 text-white"
                      iconClassName="size-4 text-white"
                    />
                    
                  </div> */}
                  {/* {active?.event?.showAmountRaisedOnVideos !== false ? (
                    <p className="text-xs opacity-90 drop-shadow-md">
                      £{liveAmountRaised} raised
                    </p>
                  ) : null} */}
                  {active?.event?.showViewCountOnVideos === true &&
                  metrics &&
                  !metricsRestrictedCommunity ? (
                    <p className="text-[11px] opacity-80 drop-shadow-md">
                      {metrics.encounters} views
                    </p>
                  ) : null}
                  {metricsRestrictedCommunity ? (
                    <p className="text-[11px] opacity-80 drop-shadow-md">
                      Insights hidden —{" "}
                      <Link
                        href={`/explore?tab=join&joinCommunity=${encodeURIComponent(metricsRestrictedCommunity.id)}`}
                        className="pointer-events-auto underline"
                      >
                        Join {metricsRestrictedCommunity.name}
                      </Link>{" "}
                      for full metrics.
                    </p>
                  ) : metrics ? (
                    <p className="text-[11px] opacity-80 drop-shadow-md">
                      {metrics.saves} saves · {metrics.shares} shares ·{" "}
                      {metrics.comments} comments
                    </p>
                  ) : null}
                </div>
                {reelEngageUnlocked ? (
                  <div className="pointer-events-auto absolute right-3 bottom-20 left-3 z-[88] [@media(min-width:640px)]:right-14">
                    <ExploreReelScrubber
                      videoRef={videoRef}
                      active={
                        Boolean(feedSurfaceActive) && Boolean(activeEventId)
                      }
                    />
                  </div>
                ) : null}
                {activeEventId ? (
                  <ImmersiveChannelActionsRail
                    eventId={activeEventId}
                    channelId={
                      activeChannelId != null ? String(activeChannelId) : null
                    }
                    videoTitle={
                      typeof active?.title === "string" ? active.title : ""
                    }
                    videoDescription={
                      typeof (active as { description?: string } | undefined)
                        ?.description === "string"
                        ? String(
                            (active as { description: string }).description
                          )
                        : ""
                    }
                    numOfTips={liveNumOfTips}
                    characters={characters as RoomCharacter[]}
                    onContinueToTip={() => setIsTipDrawerOpen(true)}
                    hostName={active?.event?.hostName ?? null}
                    isSaved={isExploreChannelSaved}
                    saveBusy={saveBusy}
                    onSaveClick={() => void handleExploreSaveToggle()}
                    commentOpen={exploreCommentOpen}
                    onCommentOpenChange={setExploreCommentOpen}
                    metricsRefreshKey={exploreCommentMetricsRefreshKey}
                    onShareOpen={() =>
                      setExploreCommentMetricsRefreshKey(k => k + 1)
                    }
                    hideTipsChip={
                      typeof active?.event?.amountToRaise === "number" &&
                      active.event.amountToRaise > 0 &&
                      !isTipDrawerOpen
                    }
                    hideHostAndAudio
                    className="pointer-events-auto absolute top-1/2 right-8 z-[90] -translate-y-1/2"
                    shareUrl={buildChannelShareUrl({
                      eventId: activeEventId,
                      channelId:
                        activeChannelId != null
                          ? String(activeChannelId)
                          : undefined,
                    })}
                    shareTitle={
                      typeof active?.title === "string" && active.title.trim()
                        ? active.title
                        : typeof active?.event?.eventName === "string"
                          ? active.event.eventName
                          : "Watch on Tipmanna"
                    }
                    videoTipCount={
                      typeof active?.numOfTips === "number"
                        ? active.numOfTips
                        : undefined
                    }
                    eventRoomTipCount={liveNumOfTips}
                  />
                ) : null}
                {typeof active?.event?.amountToRaise === "number" &&
                active.event.amountToRaise > 0 &&
                !isTipDrawerOpen ? (
                  <div className="pointer-events-auto absolute top-1/2 right-4 z-[90] -translate-y-1/2">
                    <button
                      type="button"
                      title="View tips"
                      className="absolute -top-8 right-0 cursor-pointer rounded-md bg-black/70 p-1 text-xs font-medium whitespace-nowrap text-white sm:text-sm"
                      onClick={e => {
                        e.stopPropagation();
                        setTipsListOpen(true);
                      }}
                    >
                      {liveNumOfTips} tips
                    </button>
                    <ChannelProgressBar
                      eventId={activeEventId}
                      amountToRaise={active.event.amountToRaise}
                      amountRaised={Number(liveAmountRaised)}
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {i === activeIndex && !isTipDrawerOpen ? (
              <div
                data-testid="explore-slide-actions"
                className="pointer-events-auto flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/80 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              >
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1 rounded-full px-5 shadow-lg"
                  aria-label="Create video"
                  title="Create"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCreateDialogOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                </Button>
                <div className="flex items-center">
                  <Button
                    type="button"
                    className="h-9 gap-1 rounded-full rounded-r-none bg-white px-3 text-sm text-black shadow-lg"
                    onClick={() => router.push("/tv")}
                  >
                    Watch TV
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="h-9 gap-1 rounded-full rounded-l-none px-4 text-sm shadow-lg"
                    onClick={() => setIsTipDrawerOpen(true)}
                  >
                    Engage
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1 rounded-full px-5 shadow-lg"
                  aria-label="Comments"
                  title="Comments"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExploreCommentOpen(true);
                  }}
                >
                  <MessageCircle className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <CreateDialog
        openPopup={createDialogOpen}
        setOpenPopup={setCreateDialogOpen}
        forceTypePicker
      />

      {tipDrawerStripeMounted ? (
        <TippingElementsProvider
          tippingCharacters={characters as RoomCharacter[]}
          enabled
        >
          <TipDrawer
            open={isTipDrawerOpen}
            onOpenChange={setIsTipDrawerOpen}
            eventId={activeEventId}
            tippingCharacters={characters}
            characterSets={characterSets}
            paymentSurface={
              feedMode === "community" ? "community_feed" : "explore_feed"
            }
            paymentCommunityId={
              active?.community?.id ? active.community.id : undefined
            }
            paymentChannelId={active?.id ?? null}
            openWalletModalNonce={openWalletModalNonce}
            stackAboveImmersive
          />
        </TippingElementsProvider>
      ) : null}

      {activeEventId ? (
        <TipsDrawer
          open={tipsListOpen}
          onOpenChange={setTipsListOpen}
          eventId={activeEventId}
          channelId={activeChannelId != null ? String(activeChannelId) : null}
          eventRoomTipCount={liveNumOfTips}
          videoTipCount={
            typeof active?.numOfTips === "number"
              ? active.numOfTips
              : liveNumOfTips
          }
        />
      ) : null}
    </div>
  );
});
