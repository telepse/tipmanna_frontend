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
  type CSSProperties,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ExploreFeedSkeleton } from "@/components/explore/explore-feed-skeleton";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Eye,
  MessageCircle,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { resolveContentLocaleDisplay } from "@/lib/tv/contentLocaleDisplay";
import {
  resolveExploreCoOwnerDrawerUsername,
  resolveExploreCoOwnerReelLabel,
} from "@/lib/explore-co-owner-label";
import {
  shouldHandleExploreReelEnded,
  shouldPaginateExploreReelOnEnd,
} from "@/lib/explore-reel-advance";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-events";
import {
  CREATOR_USERNAME_CHANGED_EVENT,
  patchExploreFeedHostUsername,
  resolveCreatorUsernameAlias,
  type CreatorUsernameChangedDetail,
} from "@/lib/creator-username-alias";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedTips } from "@/features/tip-slice";

import {
  getExploreChannelMetricsAction,
  postExploreFeedBatchAction,
  type ExploreChannelMetrics,
} from "@/actions/contents";
import {
  EXPLORE_FEED_BOOT_COUNT,
  takeExploreFeedBoot,
  waitExploreFeedPrefetch,
} from "@/lib/explore-feed-prefetch-cache";
import { useExploreFeedInitialLoadingFailOpen } from "@/lib/use-explore-feed-initial-loading-failopen";
import {
  computePaginationBackoffMs,
  isConfirmedFeedExhaustion,
  isDuplicateOnlyBatch,
  mergeBatchDedup,
} from "@/lib/explore-feed-pagination-policy";
import { logExplorePagination } from "@/lib/explore-feed-pagination-observability";
import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import { takeE2eFeedBatchPage } from "@/lib/e2e-explore-fixtures";
import {
  buildExploreFeedIdentity,
  isUnscopedGlobalTrendsIdentity,
  persistExploreFeedSession,
  restoreExploreFeedSession,
  type ExploreFeedSessionKeyParams,
} from "@/lib/explore-feed-session-cache";
import VideoPlayer, {
  VideoPlayerRef,
  loadReelSoundPref,
} from "@/components/events/video-player";
import {
  VideoSurfaceBadges,
  pickVideoSurfaceBadgeProps,
} from "@/components/video/video-surface-badges";
import { LiveStreamFeedBadge } from "@/components/video/live-stream-feed-badge";
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { VideoFeatureCardBanner } from "@/components/video-feature/video-feature-card-banner";
import { useFeatureCardTipContext } from "@/components/video-feature/feature-card-tip-context";
import { Button } from "@/components/ui/button";
import { useAutoDropTip } from "@/hooks/use-auto-drop-tip";
import { useTipPresentation } from "@/hooks/use-tip-presentation";
import { buildSurfaceTipPriceCatalog } from "@/lib/surface-tip-price-catalog";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { usePayerOriginAnimationRecovery } from "@/hooks/use-payer-origin-animation-recovery";
import { usePaymentPlaybackRestore } from "@/hooks/use-payment-playback-restore";
import type { RoomCharacter } from "@/types";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  setTvAnalyticsContext,
  trackTvVideoComplete,
  trackTvVideoEnd,
  trackTvVideoEncounter,
  trackTvVideoStart,
} from "@/lib/tvAnalytics";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import {
  resolveExploreOpenChannelRow,
  buildExploreOpenRowFromSnapshot,
} from "@/lib/explore-open-channel-row";
import {
  scrollExploreFeedToIndex,
  getExploreSlideStepPx,
  resolveExploreFeedScrollIndex,
} from "@/lib/explore-feed-open";
import { cn } from "@/lib/utils";
import {
  isLivestreamFamily,
  shouldOpenExploreHandoffInChannel,
} from "@/lib/discover-content-routing";
import { fetchChannelPlaybackRoute } from "@/lib/channel-playback-route";
import { PlaybackReturnBackChip } from "@/components/events/playback-return-back-chip";
import {
  isDedicatedDiscoverReturnTo,
  peekDiscoverUiRestore,
} from "@/lib/discover-return.util";
import { writePlaybackReturn } from "@/lib/playback-return-stack";
import { useOpenChannelWithReturn } from "@/hooks/use-open-channel-with-return";
import { ChannelProgressBar } from "@/components/events/channel-progress-bar";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { CreateDialog } from "@/components/home/create-dialog";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { ImmersiveChannelActionsRail } from "@/components/events/immersive-channel-actions-rail";
import { CommentDrawer } from "@/components/events/comment-drawer";
import { scheduleEngagementPwaPromptFromPolicy } from "@/lib/pwa-install-trigger";
import { setSessionSoundOn, persistReelSoundPref } from "@/lib/session-audio";
import {
  openWatchTvFromExplore,
  prefetchWatchTvFromExplore,
} from "@/lib/explore-watch-tv";
import { readPendingPaymentReturn } from "@/lib/pending-payment-return";
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
import { buildContentShareUrl } from "@/lib/public-video-url";
import {
  collectExploreFeedEventIds,
  getCachedTvEventCatalog,
  loadTvEventCatalog,
  prefetchTvEventCatalogs,
  type TvEventCatalog,
} from "@/lib/tv-event-catalog-cache";
import { useExploreReelLayoutMode } from "@/hooks/use-explore-reel-layout-mode";
import { useChannelEngagementRealtime } from "@/hooks/use-channel-engagement-realtime";
import { getAuthToken } from "@/lib/getAuthToken";
import {
  prefetchChannelDrawers,
  prefetchCreatorProfile,
} from "@/lib/drawer-prefetch-cache";
import { markExplorePerf } from "@/lib/web-vitals";
import {
  exploreReelActionsRailClassName,
  exploreReelDockActionIconClassName,
  exploreReelDockActionsClassName,
  exploreReelDockClassName,
  exploreReelDockHeightCss,
  exploreReelDockIconButtonClassName,
  exploreReelDockPrimaryButtonClassName,
  exploreReelDockScrubberClassName,
  exploreReelDockSecondaryButtonClassName,
  exploreReelFeatureCardBannerClassName,
  exploreReelMetricsClassName,
  exploreReelMuteButtonClassName,
  exploreReelMuteIconClassName,
  exploreReelRailIconButtonClassName,
  exploreReelRailIconClassName,
  exploreReelRailStackGapClassName,
  exploreReelRailTipsChipClassName,
  exploreReelScrubberTrackClassName,
  exploreReelStageClassName,
  exploreReelTapCaptureClassName,
  exploreReelTipsChipClassName,
  exploreReelTipsProgressWrapperClassName,
  exploreReelTitleAboveDockClassName,
  exploreReelTitleCommentButtonClassName,
  exploreReelTitleCommentIconClassName,
  exploreReelTitleOnVideoClassName,
  exploreReelTitlePlacement,
  exploreReelTitleRowClassName,
  exploreReelVideoBandClassName,
  exploreReelVideoPlayerClassName,
  type ExploreReelLayoutMode,
} from "@/lib/explore-reel-layout";
import type { YoutubeAspectInfo } from "@/lib/youtube-immersive-meta";
import { useMediaQuery } from "react-responsive";
import { SURFACE_MOBILE_MAX_PX } from "@/lib/surface-breakpoints";
import { CreatorDrawer } from "./creator-drawer";
import { CommunityDrawer } from "./community-drawer";
import {
  parseCommunityDrawerFromUrl,
  parseCreatorDrawerFromUrl,
} from "@/lib/playback-return-restore";
import { commitExploreHistory } from "@/lib/explore-url-history";
import { exploreLiveSearchParamsKey } from "@/lib/explore-url-sync-policy";

const TipDrawer = dynamic(
  () =>
    import("@/components/events/tip-drawer").then(m => ({
      default: m.TipDrawer,
    })),
  { ssr: false }
);

/** Append size when near end of queue. */
const EXPLORE_FEED_PAGE_COUNT = 6;
/**
 * Start loading further before the last clip so the next batch is ready well
 * before the user reaches it (infinite feed never feels exhausted). Larger
 * lead time keeps a warm buffer ahead without changing the single-flight guard.
 */
const EXPLORE_NEAR_END_SLOTS = 5;
/** Transient pagination failures use backoff retry (Endless Feed Contract); no permanent cap. */
const EXPLORE_PRELOAD_BEHIND = 0;
const EXPLORE_PRELOAD_AHEAD = 1;
const EXPLORE_REEL_VIRTUALIZE =
  process.env.NEXT_PUBLIC_EXPLORE_REEL_VIRTUALIZE === "true";
const EXPLORE_REEL_VIRTUAL_WINDOW = 2;

function hasExploreSessionAuth(isAuthenticated: boolean): boolean {
  if (isAuthenticated) return true;
  if (getAuthToken()) return true;
  if (typeof document !== "undefined") {
    return /(?:^|;\s*)(?:token|visitorToken)=/.test(document.cookie);
  }
  return false;
}

function isInReelVirtualWindow(
  slideIndex: number,
  activeIndex: number,
  itemCount: number
) {
  if (!EXPLORE_REEL_VIRTUALIZE) return true;
  const lo = Math.max(0, activeIndex - EXPLORE_REEL_VIRTUAL_WINDOW);
  const hi = Math.min(itemCount - 1, activeIndex + EXPLORE_REEL_VIRTUAL_WINDOW);
  return slideIndex >= lo && slideIndex <= hi;
}

type ExploreReelSlideMetrics = {
  views: number;
  encounters: number;
  completes: number;
  saves: number;
  shares: number;
  comments: number;
};

function liveRoutingFromSnapshot(
  channelSnapshot: Record<string, unknown> | null | undefined
): { liveStatus: string | null; isLive: boolean } {
  if (!channelSnapshot || typeof channelSnapshot !== "object") {
    return { liveStatus: null, isLive: false };
  }
  return {
    liveStatus:
      typeof channelSnapshot.liveStatus === "string"
        ? channelSnapshot.liveStatus
        : null,
    isLive: channelSnapshot.isLive === true,
  };
}

function liveRoutingFromRow(row: Record<string, unknown>): {
  liveStatus: string | null;
  isLive: boolean;
} {
  return {
    liveStatus: typeof row.liveStatus === "string" ? row.liveStatus : null,
    isLive: row.isLive === true,
  };
}

function metricsFromFeedItem(item: any): ExploreReelSlideMetrics | null {
  const raw = item?.metrics;
  if (!raw || typeof raw !== "object") return null;
  const encounters = Number((raw as { encounters?: unknown }).encounters);
  if (!Number.isFinite(encounters)) return null;
  const num = (key: string) => {
    const value = Number((raw as Record<string, unknown>)[key]);
    return Number.isFinite(value) ? value : 0;
  };
  return {
    views: num("views"),
    encounters,
    completes: num("completes"),
    saves: num("saves"),
    shares: num("shares"),
    comments: num("comments"),
  };
}

function youtubePosterUrl(videoUrl: string): string | null {
  const id = extractYoutubeID(videoUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function formatReelTime(seconds: number): string {
  const s = !Number.isFinite(seconds) || seconds < 0 ? 0 : seconds;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ExploreReelScrubber({
  videoRef,
  active,
  layoutMode,
}: {
  videoRef: RefObject<VideoPlayerRef | null>;
  active: boolean;
  layoutMode: ExploreReelLayoutMode;
}) {
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [seekT, setSeekT] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => {
      const p = videoRef.current;
      if (!p?.isReady()) return;
      if (!seeking) setT(p.getCurrentTime());
      setDur(Math.max(0, p.getDuration()));
    }, 300);
    return () => window.clearInterval(id);
  }, [active, videoRef, seeking]);

  const safeDur = dur > 0 ? dur : 1;
  const shown = seeking ? seekT : t;
  const remaining = Math.max(0, safeDur - shown);

  return (
    <div className="pointer-events-auto z-[92] w-full px-1">
      {seeking ? (
        <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-white tabular-nums drop-shadow">
          <span>{formatReelTime(shown)}</span>
          <span>-{formatReelTime(remaining)}</span>
        </div>
      ) : null}
      <input
        type="range"
        aria-label="Video position"
        min={0}
        max={safeDur}
        step={0.25}
        value={Math.min(shown, safeDur)}
        onPointerDown={e => {
          e.stopPropagation();
          setSeekT(t);
          setSeeking(true);
        }}
        onPointerUp={e => {
          e.stopPropagation();
          setSeeking(false);
        }}
        onPointerCancel={() => setSeeking(false)}
        onClick={e => e.stopPropagation()}
        onChange={e => {
          const next = Number(e.target.value);
          setSeekT(next);
          const p = videoRef.current;
          if (!p?.isReady()) return;
          p.seekTo(next);
          setT(next);
        }}
        className={exploreReelScrubberTrackClassName(layoutMode)}
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
  layoutMode: ExploreReelLayoutMode;
  presentationVideoSize: { width: number; height: number } | null;
  fullPresentationFit: "cover" | "contain";
  isMetadataLoading: boolean;
  onPlayerAspectInfo?: (info: YoutubeAspectInfo) => void;
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
  layoutMode,
  presentationVideoSize,
  fullPresentationFit,
  isMetadataLoading,
  onPlayerAspectInfo,
  videoRef,
  onActivePlaying,
  onActiveReelEnded,
  onActiveReelMuteChange,
  onPlayerError,
  playerRetryKey = 0,
  onEngageUnlocked,
}: ExploreFeedSlideVideoProps) {
  const posterObjectFitClass =
    fullPresentationFit === "contain" ? "object-contain" : "object-cover";

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

  useEffect(() => {
    if (!playbackActive) return;
    if (!loadReelSoundPref()) return;
    const p = slideIndex === activeIndex ? videoRef.current : null;
    if (!p?.isReady()) return;
    p.unmute();
    onEngageUnlocked?.();
  }, [playbackActive, slideIndex, activeIndex, videoRef, onEngageUnlocked]);

  const handleReelTap = () => {
    if (!playbackActive) return;
    const soundPrefOn = loadReelSoundPref();
    if (!engageUnlocked) {
      setEngageUnlocked(true);
      onEngageUnlocked?.();
      if (!soundPrefOn) {
        const p = slideIndex === activeIndex ? videoRef.current : null;
        if (p?.isReady()) {
          p.unmute();
          onActiveReelMuteChange?.(false);
        }
        return;
      }
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
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
        exploreReelVideoPlayerClassName(layoutMode)
      )}
    >
      <VideoSurfaceBadges
        {...pickVideoSurfaceBadgeProps(
          item,
          item.event?.id != null ? String(item.event.id) : undefined
        )}
        position="top-right"
      />
      <LiveStreamFeedBadge
        liveStatus={(item as { liveStatus?: string | null }).liveStatus ?? null}
        className="pointer-events-none absolute top-3 left-3 z-[56]"
      />
      {showPlayerMount ? (
        <>
          {isMetadataLoading ? (
            <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black">
              <div
                className={cn(
                  "max-h-full w-full max-w-full animate-pulse bg-white/10",
                  layoutMode === "mobileLandscape" ||
                    layoutMode === "desktopLandscape"
                    ? "aspect-video sm:max-w-[min(100%,520px)]"
                    : "h-full max-w-[min(100%,480px)]"
                )}
              />
            </div>
          ) : null}
          <div
            className={exploreReelTapCaptureClassName(layoutMode)}
            onPointerDownCapture={e => {
              e.preventDefault();
              e.stopPropagation();
              handleReelTap();
            }}
            aria-hidden
          />
          {pauseFlash ? (
            <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center">
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
            initialMuted={!loadReelSoundPref()}
            suppressLoadingChrome={!playbackActive}
            loadingBackdropClassName="bg-black"
            showLoadingLabel={false}
            transitionLoadingOverlay={false}
            fullPresentationFit={fullPresentationFit}
            presentationVideoSize={presentationVideoSize}
            className={exploreReelVideoPlayerClassName(layoutMode)}
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
              if (
                !shouldHandleExploreReelEnded({
                  feedSurfaceActive,
                  slideIndex,
                  activeIndex: activeIndexRef.current,
                })
              ) {
                return;
              }
              const scheduleItemId = `explore-${item.id}`;
              trackTvVideoComplete(scheduleItemId, {
                channelId: item.id,
                mode: "EXPLORE",
              });
              onActiveReelEnded?.();
            }}
            onVideoAspectInfo={onPlayerAspectInfo}
          />
        </>
      ) : inPreloadBand ? (
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-black",
            exploreReelVideoPlayerClassName(layoutMode)
          )}
        >
          {/* Explore off-stage slides: YouTube poster (external CDN). */}
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- ytimg host; skip next/image remote config
            <img
              alt=""
              src={poster}
              className={cn(
                "h-full w-full max-w-full opacity-90",
                posterObjectFitClass
              )}
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

function ExploreFeedSlideStage({
  item,
  isMobile,
  children,
}: {
  item: { url?: string | null; durationSeconds?: number | null };
  isMobile: boolean;
  children: (ctx: {
    layoutMode: ExploreReelLayoutMode;
    presentationVideoSize: { width: number; height: number } | null;
    fullPresentationFit: "cover" | "contain";
    isMetadataLoading: boolean;
    onPlayerAspectInfo: (info: YoutubeAspectInfo) => void;
  }) => ReactNode;
}) {
  const videoUrl = typeof item.url === "string" ? item.url : null;
  const durationSeconds =
    typeof item.durationSeconds === "number" ? item.durationSeconds : null;
  const {
    layoutMode,
    presentationVideoSize,
    fullPresentationFit,
    isMetadataLoading,
    onPlayerAspectInfo,
  } = useExploreReelLayoutMode(videoUrl, isMobile, { durationSeconds });
  return (
    <>
      {children({
        layoutMode,
        presentationVideoSize,
        fullPresentationFit,
        isMetadataLoading,
        onPlayerAspectInfo,
      })}
    </>
  );
}

function resolveExploreItemHostUsername(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const row = item as {
    event?: { username?: string | null };
    host?: { username?: string | null };
  };
  const username = row.event?.username ?? row.host?.username;
  if (typeof username !== "string" || !username.trim()) return null;
  return resolveCreatorUsernameAlias(username);
}

function resolveExploreItemLocale(item: unknown) {
  if (!item || typeof item !== "object") {
    return resolveContentLocaleDisplay(null, null);
  }
  const row = item as {
    contentLanguage?: string | null;
    contentCountry?: string | null;
    event?: { contentLanguage?: string | null; contentCountry?: string | null };
  };
  const contentLanguage =
    (typeof row.contentLanguage === "string" ? row.contentLanguage : null) ??
    (typeof row.event?.contentLanguage === "string"
      ? row.event.contentLanguage
      : null);
  const contentCountry =
    (typeof row.contentCountry === "string" ? row.contentCountry : null) ??
    (typeof row.event?.contentCountry === "string"
      ? row.event.contentCountry
      : null);
  return resolveContentLocaleDisplay(contentLanguage, contentCountry, {
    countryOnly: true,
  });
}

function ExploreReelLocaleFlag({
  flagUrl,
  alt,
}: {
  flagUrl: string | null;
  alt: string;
}) {
  if (!flagUrl) return null;
  return (
    <img
      src={flagUrl}
      alt={alt}
      className="inline h-3 w-4 shrink-0 rounded-sm object-cover"
    />
  );
}

type ExploreReelSlideTitleProps = {
  item: any;
  layoutMode: ExploreReelLayoutMode;
  reelMuted: boolean;
  setReelMuted: (muted: boolean) => void;
  videoRef: RefObject<VideoPlayerRef | null>;
  setExploreCommentOpen: (open: boolean) => void;
  active: any;
  metrics: ExploreReelSlideMetrics | null;
  metricsRestrictedCommunity: { id: string; name: string } | null;
  onOpenCreatorDrawer: (username: string) => void;
  onOpenCommunityDrawer?: (communityId: string) => void;
  onPrefetchCreator?: (username: string) => void;
  onEngageUnlocked?: () => void;
  className?: string;
};

function ExploreReelSlideTitle({
  item,
  layoutMode,
  reelMuted,
  setReelMuted,
  videoRef,
  setExploreCommentOpen,
  active,
  metrics,
  metricsRestrictedCommunity,
  onOpenCreatorDrawer,
  onOpenCommunityDrawer,
  onPrefetchCreator,
  onEngageUnlocked,
  className,
}: ExploreReelSlideTitleProps) {
  const hostUsername = resolveExploreItemHostUsername(item);
  const community = item.community as
    | { id?: string; name?: string }
    | null
    | undefined;
  const isCommunityBank = Boolean(community?.id && community?.name);
  const coOwnerDrawerUsername = resolveExploreCoOwnerDrawerUsername(item);
  const coOwnerLabel = resolveExploreCoOwnerReelLabel(item);
  const { flagUrl, contentLanguage } = resolveExploreItemLocale(item);

  return (
    <div className={className}>
      <div className={exploreReelTitleRowClassName(layoutMode)}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title={reelMuted ? "Unmute" : "Mute"}
            className={exploreReelMuteButtonClassName(layoutMode)}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              const nextMuted = !reelMuted;
              setReelMuted(nextMuted);
              setSessionSoundOn(!nextMuted);
              const p = videoRef.current;
              if (!p?.isReady()) return;
              if (nextMuted) {
                p.mute();
              } else {
                p.unmute();
                onEngageUnlocked?.();
              }
            }}
          >
            {reelMuted ? (
              <VolumeX className="bg-destructive size-4 rounded text-white sm:size-5" />
            ) : (
              <Volume2 className={exploreReelMuteIconClassName(layoutMode)} />
            )}
          </button>
          <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm">
            {flagUrl ? (
              <ExploreReelLocaleFlag
                flagUrl={flagUrl}
                alt={contentLanguage}
              />
            ) : null}
            {coOwnerLabel ? (
              <>
                <button
                  type="button"
                  className="cursor-pointer truncate underline-offset-2 hover:underline"
                  onPointerDown={e => e.stopPropagation()}
                  onPointerEnter={() => {
                    if (coOwnerDrawerUsername) {
                      onPrefetchCreator?.(coOwnerDrawerUsername);
                    }
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    if (coOwnerDrawerUsername) {
                      onOpenCreatorDrawer(coOwnerDrawerUsername);
                    }
                  }}
                >
                  {coOwnerLabel}
                </button>
                {isCommunityBank || hostUsername ? <span>and</span> : null}
              </>
            ) : null}
            {isCommunityBank ? (
              <>
                <button
                  type="button"
                  className="cursor-pointer truncate underline-offset-2 hover:underline"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    onOpenCommunityDrawer?.(community!.id!);
                  }}
                >
                  c {community!.name}
                </button>
              </>
            ) : null}
            {!isCommunityBank ? (
              <span className="inline-flex min-w-0 items-center gap-0.5">
                {hostUsername ? (
                  <button
                    type="button"
                    className="cursor-pointer truncate underline"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation();
                      onOpenCreatorDrawer(hostUsername);
                    }}
                    onPointerEnter={() => onPrefetchCreator?.(hostUsername)}
                  >
                    @{hostUsername}
                  </button>
                ) : (
                  <span className="truncate">@{item.event?.username}</span>
                )}
              </span>
            ) : null}
          </span>
        </div>

        <div>
          <span className="min-w-0 truncate">
            {item.title.substring(0, 30)}
          </span>

          {item.title.length > 30 ? ".." : ""}
          {item.title.length > 30 ? (
            <button
              type="button"
              aria-label="Open comments"
              className={exploreReelTitleCommentButtonClassName(layoutMode)}
              onPointerDown={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={e => {
                e.stopPropagation();
                setExploreCommentOpen(true);
              }}
            >
              <ArrowRight
                className={exploreReelTitleCommentIconClassName(layoutMode)}
              />
            </button>
          ) : null}
        </div>
      </div>
      {metricsRestrictedCommunity ? (
        <p className={exploreReelMetricsClassName(layoutMode)}>
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
        // Single metrics row: Save · Share · (eye encounter) · Comments.
        // The eye/encounter metric sits directly in front of the comment count.
        <p className={exploreReelMetricsClassName(layoutMode)}>
          {metrics.saves} saves · {metrics.shares} shares · {metrics.comments}{" "}
          comments ·
          <span className="inline-flex items-center gap-1">
            <Eye
              className="size-3"
              aria-hidden
            />
            {metrics.encounters} seen
          </span>
          {active?.event?.showViewCountOnVideos === true ? (
            <span> · {metrics.views} views</span>
          ) : null}
        </p>
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
  /** TV source for Watch TV handoff from reel dock (community id or tipmanna). */
  tvExploreSource?: string;
  trendsFilters?: {
    eventTypes: string[];
    language: string;
    country: string;
    includeEndedLive?: boolean;
  };
  ssrBoot?: { items: any[]; seed: string; bucketId: number } | null;
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    characterSets: _characterSets,
    feedSurfaceActive = true,
    feedMode = "trends",
    communityIds,
    tvExploreSource = "tipmanna",
    trendsFilters = {
      eventTypes: [] as string[],
      language: "",
      country: "",
      includeEndedLive: false,
    },
  },
  ref
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openChannelWithReturn = useOpenChannelWithReturn();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const exploreReturnTo =
    typeof pathname === "string"
      ? `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`
      : "/explore";
  const [signInOpen, setSignInOpen] = useState(false);
  const pendingSaveAfterSignInRef = useRef(false);
  const [savesRefreshEpoch, setSavesRefreshEpoch] = useState(0);
  const videoRef = useRef<VideoPlayerRef>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const hasExploreSession = hasExploreSessionAuth(isAuthenticated);
  const sessionKeyParams = useMemo<ExploreFeedSessionKeyParams>(
    () => ({
      feedMode,
      communityIds,
      trendsFilters,
    }),
    [feedMode, communityIds, trendsFilters]
  );
  const feedIdentity = useMemo(
    () => buildExploreFeedIdentity(sessionKeyParams, { hasExploreSession }),
    [sessionKeyParams, hasExploreSession]
  );
  const restoredSessionRef = useRef(
    typeof window !== "undefined"
      ? restoreExploreFeedSession(sessionKeyParams, { hasExploreSession })
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
        isUnscopedGlobalTrendsIdentity(sessionKeyParams);
      exploreBootRef.current = useTrendsPrefetchBoot
        ? takeExploreFeedBoot({
            feedMode: "trends",
            identity: sessionKeyParams,
          })
        : feedMode === "saves"
          ? takeExploreFeedBoot({ feedMode: "saves" })
          : feedMode === "community"
            ? takeExploreFeedBoot({
                feedMode: "community",
                communityIds,
              })
            : { items: [], seed: undefined };
    }
  }
  const seedRef = useRef<string | undefined>(exploreBootRef.current.seed);
  const loadingMoreRef = useRef(false);
  /** Set synchronously on scroll near-end so metrics SAs yield the queue before pagination effect runs. */
  const metricsSuppressedRef = useRef(false);
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
  const [bootLoadFailed, setBootLoadFailed] = useState(false);
  useExploreFeedInitialLoadingFailOpen(initialLoading, setInitialLoading);
  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exploreCommentOpen, setExploreCommentOpen] = useState(false);
  const openExploreCommentDrawer = useCallback((open: boolean) => {
    if (open) {
      setIsTipDrawerOpen(false);
      setTipsListOpen(false);
      void scheduleEngagementPwaPromptFromPolicy();
    }
    setExploreCommentOpen(open);
  }, []);
  const [creatorDrawerOpen, setCreatorDrawerOpen] = useState(false);
  const [creatorDrawerUsername, setCreatorDrawerUsername] = useState<
    string | null
  >(null);
  const [communityDrawerOpen, setCommunityDrawerOpen] = useState(false);
  const [communityDrawerId, setCommunityDrawerId] = useState<string | null>(
    null
  );
  const [exploreCommentMetricsRefreshKey, setExploreCommentMetricsRefreshKey] =
    useState(0);
  const [tipsListOpen, setTipsListOpen] = useState(false);
  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [saveBusy, setSaveBusy] = useState(false);
  const [scrollSyncEpoch, setScrollSyncEpoch] = useState(0);
  const [paginationScrollEpoch, setPaginationScrollEpoch] = useState(0);
  const [paginationRetryEpoch, setPaginationRetryEpoch] = useState(0);
  const [reelMuted, setReelMuted] = useState(() => !loadReelSoundPref());

  const syncDrawerExploreUrl = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const liveKey = exploreLiveSearchParamsKey(
        searchParams?.toString() ?? ""
      );
      const params = new URLSearchParams(liveKey);
      mutate(params);
      commitExploreHistory({
        href: `/explore?${params.toString()}`,
        mode: "replace",
        source: "passive-sync",
      });
    },
    [searchParams]
  );

  const openCreatorDrawer = useCallback(
    (username: string) => {
      const handle = resolveCreatorUsernameAlias(username);
      if (!handle) return;
      setCreatorDrawerUsername(handle);
      setCreatorDrawerOpen(true);
      syncDrawerExploreUrl(params => {
        params.delete("communityDrawer");
        params.set("creatorDrawer", handle);
      });
    },
    [syncDrawerExploreUrl]
  );

  const handleCreatorDrawerOpenChange = useCallback(
    (open: boolean) => {
      setCreatorDrawerOpen(open);
      if (!open) {
        setCreatorDrawerUsername(null);
        syncDrawerExploreUrl(params => {
          params.delete("creatorDrawer");
        });
      }
    },
    [syncDrawerExploreUrl]
  );

  const openCommunityDrawer = useCallback(
    (communityId: string) => {
      const id = communityId.trim();
      if (!id) return;
      setCommunityDrawerId(id);
      setCommunityDrawerOpen(true);
      syncDrawerExploreUrl(params => {
        params.delete("creatorDrawer");
        params.set("communityDrawer", id);
      });
    },
    [syncDrawerExploreUrl]
  );

  const handleCommunityDrawerOpenChange = useCallback(
    (open: boolean) => {
      setCommunityDrawerOpen(open);
      if (!open) {
        setCommunityDrawerId(null);
        syncDrawerExploreUrl(params => {
          params.delete("communityDrawer");
        });
      }
    },
    [syncDrawerExploreUrl]
  );

  useEffect(() => {
    const creator = parseCreatorDrawerFromUrl(searchParams);
    const community = parseCommunityDrawerFromUrl(searchParams);
    if (creator) {
      setCreatorDrawerUsername(creator);
      setCreatorDrawerOpen(true);
    }
    if (community) {
      setCommunityDrawerId(community);
      setCommunityDrawerOpen(true);
    }
  }, [searchParams]);

  const { user } = useSelector((s: RootState) => s.auth);

  const feedQueryKey = useMemo(() => {
    if (
      (feedMode === "saves" || feedMode === "community") &&
      savesRefreshEpoch > 0
    ) {
      return `${feedIdentity.storageKey}:r:${savesRefreshEpoch}`;
    }
    return feedIdentity.storageKey;
  }, [feedIdentity.storageKey, feedMode, savesRefreshEpoch]);

  const loadedQueryKeyRef = useRef<string | null>(null);
  if (
    loadedQueryKeyRef.current === null &&
    exploreBootRef.current!.items.length > 0
  ) {
    loadedQueryKeyRef.current = feedQueryKey;
  }
  const [bootSettled, setBootSettled] = useState(
    () => exploreBootRef.current!.items.length > 0
  );
  const feedLoadGenerationRef = useRef(0);
  const paginationFailCountRef = useRef(0);
  const paginationUiCycleRef = useRef(0);
  const lastPaginationFetchMetaRef = useRef<
    import("@/lib/action-fetch").ExplorePaginationFetchMeta | undefined
  >(undefined);
  const paginationQueryKeyRef = useRef<string | null>(null);
  const paginationRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const schedulePaginationRetry = useCallback((delayMs: number) => {
    if (paginationRetryTimerRef.current) {
      clearTimeout(paginationRetryTimerRef.current);
    }
    paginationRetryTimerRef.current = setTimeout(() => {
      paginationRetryTimerRef.current = null;
      setPaginationRetryEpoch(e => e + 1);
    }, delayMs);
  }, []);

  const initialLoadingRef = useRef(initialLoading);
  initialLoadingRef.current = initialLoading;
  const pendingOpenRef = useRef<ExploreFeedOpenTarget | null>(null);
  const openingVideoIdRef = useRef<string | null>(null);
  const openGenerationRef = useRef(0);
  const scrollLayoutRetryRef = useRef(0);

  const active = items[activeIndex];
  const activeEventId = active?.event?.id ?? "";
  const activeChannelId = active?.id;

  const isMobile = useMediaQuery({ maxWidth: SURFACE_MOBILE_MAX_PX });

  const playingVideoKey = useMemo(() => {
    if (!activeEventId || activeChannelId == null) return "";
    return `${activeChannelId}:${activeEventId}`;
  }, [activeChannelId, activeEventId]);

  // Warm comment/tips/profile drawer payloads for the active reel so opening
  // any drawer is instant (no first-open wait). Idle-scheduled and cached, so
  // this does not compete with playback/preload work.
  useEffect(() => {
    if (!activeEventId || activeChannelId == null) return;
    prefetchChannelDrawers({
      eventId: activeEventId,
      channelId: String(activeChannelId),
      authenticated: Boolean(getAuthToken()),
    });
    const hostUsername = resolveExploreItemHostUsername(active);
    if (hostUsername) prefetchCreatorProfile(hostUsername);
  }, [activeEventId, activeChannelId, active]);

  const [videoTipCatalog, setVideoTipCatalog] = useState<TvEventCatalog | null>(
    null
  );

  useEffect(() => {
    if (!playingVideoKey || !activeEventId) {
      setVideoTipCatalog(null);
      return;
    }

    setVideoTipCatalog(getCachedTvEventCatalog(activeEventId));

    let cancelled = false;
    void loadTvEventCatalog(activeEventId).then(catalog => {
      if (!cancelled) setVideoTipCatalog(catalog);
    });

    return () => {
      cancelled = true;
    };
  }, [playingVideoKey, activeEventId]);

  useEffect(() => {
    if (!items.length) return;
    prefetchTvEventCatalogs(collectExploreFeedEventIds(items, 24));
  }, [items]);

  const characterSetsForDrawer = (videoTipCatalog?.characterSets ?? []).filter(
    set => Array.isArray(set.characters) && set.characters.length > 0
  );

  const tippingCharactersForDrawer = videoTipCatalog?.characters?.length
    ? (videoTipCatalog.characters as RoomCharacter[])
    : (characters as RoomCharacter[]);

  const tipPres = useTipPresentation(
    activeEventId || undefined,
    tippingCharactersForDrawer,
    {
      paymentSurface:
        feedMode === "community" ? "community_feed" : "explore_feed",
    }
  );

  const tipPriceCatalog = useMemo(
    () =>
      buildSurfaceTipPriceCatalog({
        enrichedCatalog: tipPres.catalog as RoomCharacter[],
        videoCatalog: tippingCharactersForDrawer,
        fallbackCatalog: characters as RoomCharacter[],
        characterSets: characterSetsForDrawer,
      }),
    [
      tipPres.catalog,
      tippingCharactersForDrawer,
      characters,
      characterSetsForDrawer,
    ]
  );

  const dispatch = useDispatch();
  const prevPlayingVideoKeyRef = useRef("");

  useEffect(() => {
    if (!playingVideoKey) return;
    if (prevPlayingVideoKeyRef.current === playingVideoKey) return;
    const prev = prevPlayingVideoKeyRef.current;
    prevPlayingVideoKeyRef.current = playingVideoKey;
    if (prev === "") return;
    dispatch(setSelectedTips([]));
  }, [playingVideoKey, dispatch]);

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
    if (!user || user.role === "VISITOR") {
      pendingSaveAfterSignInRef.current = true;
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
          void scheduleEngagementPwaPromptFromPolicy();
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
  }, [refreshSavedContents, saveExploreChannelId, savedContents, user]);

  const handleSaveSignInVerified = useCallback(() => {
    setSavesRefreshEpoch(e => e + 1);
    if (pendingSaveAfterSignInRef.current) {
      pendingSaveAfterSignInRef.current = false;
      void handleExploreSaveToggle();
    }
  }, [handleExploreSaveToggle]);

  const [baseMetrics, setBaseMetrics] =
    useState<ExploreReelSlideMetrics | null>(null);
  const [metricsRestrictedCommunity, setMetricsRestrictedCommunity] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!feedSurfaceActive) {
      setBaseMetrics(null);
      setMetricsRestrictedCommunity(null);
      return;
    }
    const rawId = activeChannelId != null ? String(activeChannelId) : "";
    if (!rawId) {
      setBaseMetrics(null);
      setMetricsRestrictedCommunity(null);
      return;
    }

    const fromPayload = metricsFromFeedItem(active);
    if (fromPayload) {
      setBaseMetrics(fromPayload);
      setMetricsRestrictedCommunity(null);
      return;
    }

    const len = itemsRef.current.length;
    const idx = activeIndexRef.current;
    if (
      metricsSuppressedRef.current ||
      loadingMoreRef.current ||
      (len > 0 && idx >= len - EXPLORE_NEAR_END_SLOTS)
    ) {
      return;
    }

    let cancelled = false;
    const probeTimer = window.setTimeout(() => {
      void (async () => {
        // Pagination continuation uses the same server-action queue; defer
        // metrics probes while near-end pagination is armed or in flight.
        while (metricsSuppressedRef.current || loadingMoreRef.current) {
          await new Promise<void>(resolve => {
            window.setTimeout(resolve, 100);
          });
          if (cancelled) return;
        }
        const curLen = itemsRef.current.length;
        const curIdx = activeIndexRef.current;
        if (curLen > 0 && curIdx >= curLen - EXPLORE_NEAR_END_SLOTS) {
          return;
        }
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
            setBaseMetrics(null);
            const c = (d as { community?: { id: string; name: string } })
              .community;
            setMetricsRestrictedCommunity(
              c?.id && c?.name ? { id: c.id, name: c.name } : null
            );
            return;
          }
          setMetricsRestrictedCommunity(null);
          setBaseMetrics(d as ExploreChannelMetrics);
          setItems(prev =>
            prev.map(it =>
              String(it.id) === rawId ? { ...it, metrics: d } : it
            )
          );
        } else {
          setBaseMetrics(null);
          setMetricsRestrictedCommunity(null);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(probeTimer);
    };
  }, [active, activeChannelId, feedSurfaceActive]);

  const metrics = useChannelEngagementRealtime({
    channelId: activeChannelId != null ? String(activeChannelId) : null,
    initial: baseMetrics,
    enabled:
      feedSurfaceActive &&
      Boolean(activeChannelId) &&
      !metricsRestrictedCommunity,
  });
  const { openWalletModalNonce } = useWalletTopupTipResume(
    activeEventId || undefined,
    setIsTipDrawerOpen
  );
  const tipDrawerStripeMounted = isTipDrawerOpen || openWalletModalNonce > 0;
  const activeRef = useRef(active);
  activeRef.current = active;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    setReelEngageUnlocked(false);
  }, [activeIndex]);

  const didMarkFirstPlayRef = useRef(false);

  const handleExploreClipPlaying = useCallback(() => {
    const idx = activeIndexRef.current;
    const cur = activeRef.current;
    if (!cur) return;
    if (!didMarkFirstPlayRef.current) {
      didMarkFirstPlayRef.current = true;
      markExplorePerf("explore-first-playable");
    }
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
  usePayerOriginAnimationRecovery({
    eventId: activeEventId,
    paymentSurface: ["explore_feed", "community_feed"],
    characters: characters as RoomCharacter[],
    enabled: feedSurfaceActive,
    surface: "explore_feed",
  });
  usePaymentPlaybackRestore({
    enabled: feedSurfaceActive,
    paymentSurface: ["explore_feed", "community_feed"],
    videoRef,
    currentChannelId: active?.id != null ? String(active.id) : null,
    onMuteChange: setReelMuted,
  });

  const tipDrawerPlaybackSnapshotRef = useRef<{
    channelId: string | null;
    offsetSec: number;
    wasPlaying: boolean;
    wasMuted: boolean;
  } | null>(null);
  const prevTipDrawerOpenRef = useRef(false);

  useEffect(() => {
    const wasOpen = prevTipDrawerOpenRef.current;
    prevTipDrawerOpenRef.current = isTipDrawerOpen;

    if (isTipDrawerOpen && !wasOpen) {
      const p = videoRef.current;
      const cur = activeRef.current;
      tipDrawerPlaybackSnapshotRef.current = {
        channelId: cur?.id != null ? String(cur.id) : null,
        offsetSec: p?.getCurrentTime() ?? 0,
        wasPlaying: true,
        wasMuted: reelMuted,
      };
      p?.pause();
      return;
    }

    if (!isTipDrawerOpen && wasOpen) {
      if (readPendingPaymentReturn()?.isRedirectPayment) return;
      const snap = tipDrawerPlaybackSnapshotRef.current;
      tipDrawerPlaybackSnapshotRef.current = null;
      if (!snap) return;
      const p = videoRef.current;
      if (!p) return;
      if (snap.offsetSec > 0) p.seekTo(snap.offsetSec);
      if (snap.wasPlaying) p.play();
      if (snap.wasMuted) {
        p.mute();
        setReelMuted(true);
      } else {
        p.unmute();
        setReelMuted(false);
        persistReelSoundPref(true);
      }
    }
  }, [isTipDrawerOpen, reelMuted]);

  const getExplorePaymentRestoreSnapshot = useCallback(() => {
    const snap = tipDrawerPlaybackSnapshotRef.current;
    if (!snap?.channelId) return null;
    return {
      channelId: snap.channelId,
      offsetSec: snap.offsetSec,
      wasMuted: snap.wasMuted,
      capture: "drawer_open" as const,
    };
  }, []);
  useAutoDropTip(activeEventId, Boolean(activeEventId) && feedSurfaceActive);

  const {
    amountRaised: liveAmountRaised,
    numOfTips: liveNumOfTips,
    channelNumOfTips: liveChannelNumOfTips,
  } = useEventRoomRealtime({
    eventId: activeEventId,
    initialAmountRaised: active?.event?.amountRaised ?? 0,
    initialNumOfTips: active?.event?.numOfTips ?? 0,
    channelId: active?.id ? String(active.id) : null,
    initialChannelNumOfTips:
      typeof active?.numOfTips === "number" ? active.numOfTips : 0,
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
    const onCreatorUsernameChanged = (event: Event) => {
      const detail = (event as CustomEvent<CreatorUsernameChangedDetail>)
        .detail;
      if (!detail?.previousUsername || !detail.username) return;

      setItems(
        prev =>
          patchExploreFeedHostUsername(
            prev,
            detail.previousUsername,
            detail.username
          ) as typeof prev
      );
      setCreatorDrawerUsername(current => {
        if (!current) return current;
        const previous = detail.previousUsername
          .trim()
          .replace(/^@/, "")
          .toLowerCase();
        if (current.toLowerCase() === previous) {
          return resolveCreatorUsernameAlias(detail.username);
        }
        return current;
      });
    };

    window.addEventListener(
      CREATOR_USERNAME_CHANGED_EVENT,
      onCreatorUsernameChanged
    );
    return () =>
      window.removeEventListener(
        CREATOR_USERNAME_CHANGED_EVENT,
        onCreatorUsernameChanged
      );
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    persistExploreFeedSession(
      sessionKeyParams,
      {
        items,
        seed: seedRef.current,
        activeIndex,
        scrollTop: scrollRef.current?.scrollTop,
      },
      { hasExploreSession }
    );
  }, [items, activeIndex, sessionKeyParams, hasExploreSession]);

  useEffect(() => {
    return () => {
      const curItems = itemsRef.current;
      if (curItems.length === 0) return;
      persistExploreFeedSession(
        sessionKeyParams,
        {
          items: curItems,
          seed: seedRef.current,
          activeIndex: activeIndexRef.current,
          // eslint-disable-next-line react-hooks/exhaustive-deps
          scrollTop: scrollRef.current?.scrollTop,
        },
        { hasExploreSession }
      );
    };
  }, [sessionKeyParams, hasExploreSession]);

  useEffect(() => {
    const top = restoredSessionRef.current?.scrollTop;
    const root = scrollRef.current;
    if (top == null || !root) return;
    requestAnimationFrame(() => {
      root.scrollTop = top;
    });
  }, []);

  const fetchBatch = useCallback(
    async (
      list: any[],
      count: number,
      paginationOpts?: { traceId?: string; attempt?: number }
    ) => {
      const scope = feedIdentity.fetchScope;
      if (
        scope.feedMode === "community" &&
        !(scope.communityIds?.length ?? 0)
      ) {
        return [];
      }
      if (isExploreE2eFixturesActiveOnClient()) {
        return takeE2eFeedBatchPage(list.length, count);
      }
      const r = await postExploreFeedBatchAction(
        list.map((x: any) => x.id),
        seedRef.current,
        count,
        undefined,
        {
          ...scope,
          ...(list.length > 0 && paginationOpts?.traceId
            ? {
                paginationTraceId: paginationOpts.traceId,
                paginationAttempt: paginationOpts.attempt ?? 1,
              }
            : {}),
        }
      );
      if (!r.success || !r.data) {
        if (list.length === 0) {
          toast.error(r.error ?? r.message ?? "Could not load explore feed");
        }
        if (list.length > 0 && r.fetchMeta) {
          logExplorePagination({
            phase: "failure",
            feedMode: scope.feedMode ?? "trends",
            traceId: paginationOpts?.traceId,
            uiCycle: paginationOpts?.attempt,
            coalesceStage: r.fetchMeta.coalesceStage,
            coalesceKeyHash: r.fetchMeta.coalesceKeyHash,
            coalesceInstanceId: r.fetchMeta.coalesceInstanceId,
            fetchDurationMs: r.fetchMeta.durationMs,
            aborted: r.fetchMeta.aborted,
            reason: r.error ?? r.message ?? "transient",
          });
        }
        return null;
      }
      if (scope.feedMode === "saves" && r.data.savesFeedEligible === false) {
        setSavesBlocked(r.data.savesFeedReason ?? "auth");
        if (r.data.seed) seedRef.current = r.data.seed;
        return [];
      }
      setSavesBlocked(null);
      if (r.data.seed) seedRef.current = r.data.seed;
      if (list.length > 0) lastPaginationFetchMetaRef.current = r.fetchMeta;
      return Array.isArray(r.data.items) ? (r.data.items as any[]) : [];
    },
    [feedIdentity]
  );

  useEffect(() => {
    if (feedMode !== "saves" && feedMode !== "community") return;
    const onAuthChanged = () => setSavesRefreshEpoch(e => e + 1);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [feedMode]);

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
    const onAuthChanged = () => maybeReload();
    const onVis = () => {
      if (document.visibilityState === "visible") maybeReload();
    };
    window.addEventListener("tipmanna:saves-changed", onSavesChanged);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("tipmanna:saves-changed", onSavesChanged);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [feedMode]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "auto") => {
      const root = scrollRef.current;
      if (!root || itemsRef.current.length === 0) return;
      const h = getExploreSlideStepPx(root);
      if (h <= 0) return;
      const idx = Math.min(itemsRef.current.length - 1, Math.max(0, index));
      scrollExploreFeedToIndex(root, idx, behavior);
      if (behavior !== "smooth") {
        activeIndexRef.current = idx;
        setActiveIndex(prev => (prev === idx ? prev : idx));
      }
      const len = itemsRef.current.length;
      if (len > 0 && idx >= len - EXPLORE_NEAR_END_SLOTS) {
        setPaginationScrollEpoch(e => e + 1);
      }
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
    const len = itemsRef.current.length;
    if (idx >= len - 1) {
      if (shouldPaginateExploreReelOnEnd(idx, len, EXPLORE_NEAR_END_SLOTS)) {
        setPaginationScrollEpoch(e => e + 1);
      }
      return;
    }
    scrollToIndex(idx + 1, "smooth");
  }, [feedSurfaceActive, scrollToIndex]);

  const executeOpenInExplore = useCallback(
    async (target: ExploreFeedOpenTarget) => {
      const { videoId, channelSnapshot } = target;
      const channelReturn = () => ({
        returnTo: target.discoverReturnTo ?? exploreReturnTo,
        label:
          target.discoverReturnLabel ??
          (target.discoverReturnTo ? "Back to Discover" : "Back to Explore"),
        discoverUi: peekDiscoverUiRestore() ?? undefined,
      });
      const openLiveInChannel = () => {
        openingVideoIdRef.current = null;
        openChannelWithReturn({
          eventId: target.eventId,
          channelId: videoId,
          ...channelReturn(),
        });
      };

      const snapshotLive = liveRoutingFromSnapshot(
        channelSnapshot as Record<string, unknown> | null | undefined
      );
      if (shouldOpenExploreHandoffInChannel(snapshotLive)) {
        openLiveInChannel();
        return;
      }
      if (!isLivestreamFamily(snapshotLive)) {
        const route = await fetchChannelPlaybackRoute(videoId);
        if (route?.route === "channel") {
          openLiveInChannel();
          return;
        }
      }
      if (
        target.discoverReturnTo &&
        isDedicatedDiscoverReturnTo(target.discoverReturnTo)
      ) {
        writePlaybackReturn({
          returnTo: target.discoverReturnTo,
          label: target.discoverReturnLabel ?? "Back to Discover",
          discoverUi: peekDiscoverUiRestore() ?? undefined,
        });
      }
      const myGen = ++openGenerationRef.current;
      scrollLayoutRetryRef.current = 0;
      openingVideoIdRef.current = videoId;

      const commitPendingOpenScroll = () => {
        setScrollSyncEpoch(e => e + 1);
        setActiveIndex(prev => {
          const idx = itemsRef.current.findIndex(i => i.id === videoId);
          return idx >= 0 ? idx : prev;
        });
      };

      const existingIdx = itemsRef.current.findIndex(i => i.id === videoId);
      if (existingIdx >= 0) {
        openingVideoIdRef.current = videoId;
        setItems(prev => {
          if (myGen !== openGenerationRef.current) return prev;
          const idx = prev.findIndex(i => i.id === videoId);
          if (idx < 0) return prev;
          const row = prev[idx];
          return [row, ...prev.filter(i => i.id !== videoId)];
        });
        commitPendingOpenScroll();
        const existing = itemsRef.current[existingIdx];
        const needsEnrichment =
          !metricsFromFeedItem(existing) ||
          typeof existing?.event?.amountToRaise !== "number";
        if (needsEnrichment) {
          void resolveExploreOpenChannelRow(target).then(enriched => {
            if (myGen !== openGenerationRef.current) return;
            if (!enriched) return;
            const enrichedLive = liveRoutingFromRow(enriched);
            if (shouldOpenExploreHandoffInChannel(enrichedLive)) {
              openLiveInChannel();
              return;
            }
            setItems(prev => {
              if (myGen !== openGenerationRef.current) return prev;
              const idx = prev.findIndex(i => i.id === videoId);
              if (idx < 0) return prev;
              const next = [...prev];
              next[idx] = { ...prev[idx], ...enriched };
              if (idx > 0) {
                const [row] = next.splice(idx, 1);
                next.unshift(row);
              }
              return next;
            });
          });
        }
        return;
      }

      const snapshotRow = buildExploreOpenRowFromSnapshot(target);
      if (snapshotRow) {
        setItems(prev => {
          if (myGen !== openGenerationRef.current) return prev;
          if (openingVideoIdRef.current !== videoId) return prev;
          const existingAt = prev.findIndex(i => i.id === videoId);
          if (existingAt >= 0) {
            const row = prev[existingAt];
            return [row, ...prev.filter(i => i.id !== videoId)];
          }
          return [snapshotRow, ...prev.filter(i => i.id !== videoId)];
        });
        commitPendingOpenScroll();
        void resolveExploreOpenChannelRow(target).then(enriched => {
          if (myGen !== openGenerationRef.current) return;
          if (!enriched) return;
          const enrichedLive = liveRoutingFromRow(enriched);
          if (shouldOpenExploreHandoffInChannel(enrichedLive)) {
            openLiveInChannel();
            return;
          }
          setItems(prev => {
            if (myGen !== openGenerationRef.current) return prev;
            const idx = prev.findIndex(i => i.id === videoId);
            if (idx < 0) return prev;
            const next = [...prev];
            next[idx] = { ...prev[idx], ...enriched };
            return next;
          });
        });
        return;
      }

      const row = await resolveExploreOpenChannelRow(target);
      if (myGen !== openGenerationRef.current) return;
      if (!row) {
        openingVideoIdRef.current = null;
        return;
      }
      const rowLive = liveRoutingFromRow(row);
      if (shouldOpenExploreHandoffInChannel(rowLive)) {
        openLiveInChannel();
        return;
      }

      setItems(prev => {
        if (myGen !== openGenerationRef.current) return prev;
        if (openingVideoIdRef.current !== videoId) return prev;
        if (prev.some(i => i.id === videoId)) return prev;
        return [row, ...prev.filter(i => i.id !== videoId)];
      });
      if (myGen !== openGenerationRef.current) return;
      if (openingVideoIdRef.current !== videoId) return;
      commitPendingOpenScroll();
    },
    [exploreReturnTo, openChannelWithReturn]
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
      if (scrollLayoutRetryRef.current < 48) {
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

  /** Initial boot + intentional reload when feedQueryKey changes (filters, mode, auth). */
  useEffect(() => {
    if (loadedQueryKeyRef.current === feedQueryKey) {
      setInitialLoading(false);
      setBootSettled(true);
      return;
    }

    const gen = ++feedLoadGenerationRef.current;
    let cancelled = false;
    const isIntentionalReload = loadedQueryKeyRef.current !== null;
    endOfFeedRef.current = false;
    setSavesBlocked(null);
    setBootLoadFailed(false);
    setBootSettled(false);
    if (isIntentionalReload) {
      setActiveIndex(0);
    }

    void (async () => {
      try {
        if (
          feedMode === "community" &&
          (!(communityIds?.length ?? 0) || !hasExploreSession)
        ) {
          if (cancelled || gen !== feedLoadGenerationRef.current) return;
          setItems([]);
          loadedQueryKeyRef.current = feedQueryKey;
          return;
        }
        const warmed = await waitExploreFeedPrefetch({
          feedMode,
          communityIds,
          identity: sessionKeyParams,
        });
        if (cancelled || gen !== feedLoadGenerationRef.current) return;
        if (
          isUnscopedGlobalTrendsIdentity(sessionKeyParams) &&
          warmed?.items?.length
        ) {
          seedRef.current = warmed.seed;
          setItems(warmed.items);
          loadedQueryKeyRef.current = feedQueryKey;
          return;
        }
        if (feedMode === "saves" && warmed?.items?.length) {
          seedRef.current = warmed.seed;
          setItems(warmed.items);
          loadedQueryKeyRef.current = feedQueryKey;
          return;
        }
        if (feedMode === "community" && warmed?.items?.length) {
          seedRef.current = warmed.seed;
          setItems(warmed.items);
          loadedQueryKeyRef.current = feedQueryKey;
          return;
        }
        const batch = await fetchBatch([], EXPLORE_FEED_BOOT_COUNT);
        if (cancelled || gen !== feedLoadGenerationRef.current) return;
        if (batch === null) {
          setBootLoadFailed(true);
          setItems([]);
        } else {
          setItems(batch);
        }
        loadedQueryKeyRef.current = feedQueryKey;
      } finally {
        if (cancelled || gen !== feedLoadGenerationRef.current) return;
        setInitialLoading(false);
        setBootSettled(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    feedQueryKey,
    fetchBatch,
    feedMode,
    communityIds,
    hasExploreSession,
    sessionKeyParams,
  ]);

  useEffect(() => {
    if (!feedSurfaceActive) return;

    if (paginationQueryKeyRef.current !== feedQueryKey) {
      paginationQueryKeyRef.current = feedQueryKey;
      paginationFailCountRef.current = 0;
      paginationUiCycleRef.current = 0;
    }

    if (endOfFeedRef.current) return;
    const len = itemsRef.current.length;
    const scrollIndex = resolveExploreFeedScrollIndex(
      scrollRef.current,
      len,
      activeIndexRef.current
    );
    if (scrollIndex !== activeIndexRef.current) {
      activeIndexRef.current = scrollIndex;
      setActiveIndex(prev => (prev === scrollIndex ? prev : scrollIndex));
    }
    if (len === 0 || scrollIndex < len - EXPLORE_NEAR_END_SLOTS) {
      paginationFailCountRef.current = 0;
      return;
    }
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;

    const loadGen = feedLoadGenerationRef.current;
    const queryKey = loadedQueryKeyRef.current;
    const excludeCount = itemsRef.current.length;
    paginationUiCycleRef.current += 1;
    const uiCycle = paginationUiCycleRef.current;
    const traceId = `pag-${uiCycle}-${loadGen}-${Date.now().toString(36)}`;

    logExplorePagination({
      phase: "request",
      feedMode,
      uiCycle,
      traceId,
      itemCount: len,
      activeIndex: scrollIndex,
    });

    void (async () => {
      try {
        const batch = await fetchBatch(
          itemsRef.current,
          EXPLORE_FEED_PAGE_COUNT,
          { traceId, attempt: uiCycle }
        );
        if (loadGen !== feedLoadGenerationRef.current) return;
        if (queryKey !== loadedQueryKeyRef.current) return;

        if (batch === null) {
          paginationFailCountRef.current += 1;
          const backoffMs = computePaginationBackoffMs(
            paginationFailCountRef.current
          );
          logExplorePagination({
            phase: "failure",
            feedMode,
            uiCycle,
            itemCount: itemsRef.current.length,
            failStreak: paginationFailCountRef.current,
            backoffMs,
            activeIndex: activeIndexRef.current,
            reason: "transient",
          });
          const curLen = itemsRef.current.length;
          const idx = resolveExploreFeedScrollIndex(
            scrollRef.current,
            curLen,
            activeIndexRef.current
          );
          const stillNearEnd =
            curLen > 0 && idx >= curLen - EXPLORE_NEAR_END_SLOTS;
          if (stillNearEnd) {
            logExplorePagination({
              phase: "retry",
              feedMode,
              uiCycle,
              itemCount: curLen,
              failStreak: paginationFailCountRef.current,
              backoffMs,
              activeIndex: idx,
            });
            schedulePaginationRetry(backoffMs);
          }
          return;
        }

        paginationFailCountRef.current = 0;

        if (
          isConfirmedFeedExhaustion({
            batchLength: batch.length,
            feedMode,
            hadExcludeIds: excludeCount > 0,
          })
        ) {
          endOfFeedRef.current = true;
          logExplorePagination({
            phase: "exhaustion",
            feedMode,
            itemCount: itemsRef.current.length,
            activeIndex: activeIndexRef.current,
          });
          return;
        }

        if (batch.length === 0) {
          if (feedMode === "saves") {
            const backoffMs = computePaginationBackoffMs(1);
            logExplorePagination({
              phase: "retry",
              feedMode,
              itemCount: itemsRef.current.length,
              backoffMs,
              reason: "saves_empty_batch",
            });
            schedulePaginationRetry(backoffMs);
          }
          return;
        }

        if (isDuplicateOnlyBatch(itemsRef.current, batch)) {
          const backoffMs = computePaginationBackoffMs(1);
          logExplorePagination({
            phase: "duplicate_batch",
            feedMode,
            itemCount: itemsRef.current.length,
            batchSize: batch.length,
            newItems: 0,
            backoffMs,
            activeIndex: activeIndexRef.current,
          });
          logExplorePagination({
            phase: "retry",
            feedMode,
            itemCount: itemsRef.current.length,
            backoffMs,
            reason: "duplicate_only",
          });
          schedulePaginationRetry(backoffMs);
          return;
        }

        setItems(prev => {
          if (loadGen !== feedLoadGenerationRef.current) return prev;
          if (queryKey !== loadedQueryKeyRef.current) return prev;
          const { items: merged, newCount } = mergeBatchDedup(prev, batch);
          if (newCount > 0) {
            const meta = lastPaginationFetchMetaRef.current;
            logExplorePagination({
              phase: "success",
              feedMode,
              uiCycle,
              traceId,
              itemCount: merged.length,
              batchSize: batch.length,
              newItems: newCount,
              activeIndex: activeIndexRef.current,
              coalesceStage: meta?.coalesceStage,
              coalesceKeyHash: meta?.coalesceKeyHash,
              coalesceInstanceId: meta?.coalesceInstanceId,
              fetchDurationMs: meta?.durationMs,
            });
            lastPaginationFetchMetaRef.current = undefined;
          }
          return merged;
        });
      } finally {
        loadingMoreRef.current = false;
        const root = scrollRef.current;
        const curLen = itemsRef.current.length;
        const curIdx = activeIndexRef.current;
        metricsSuppressedRef.current =
          endOfFeedRef.current ||
          (curLen > 0 && curIdx >= curLen - EXPLORE_NEAR_END_SLOTS);
        if (root && curLen > 0) {
          const synced = resolveExploreFeedScrollIndex(
            root,
            curLen,
            activeIndexRef.current
          );
          if (synced !== activeIndexRef.current) {
            activeIndexRef.current = synced;
            setActiveIndex(prev => (prev === synced ? prev : synced));
          }
        }
      }
    })();
  }, [
    activeIndex,
    fetchBatch,
    feedMode,
    feedQueryKey,
    items.length,
    paginationRetryEpoch,
    paginationScrollEpoch,
    feedSurfaceActive,
    schedulePaginationRetry,
  ]);

  /** Resume pagination after transient failures when backend recovers. */
  useEffect(() => {
    const tryResumePagination = () => {
      if (endOfFeedRef.current) return;
      const len = itemsRef.current.length;
      const idx = resolveExploreFeedScrollIndex(
        scrollRef.current,
        len,
        activeIndexRef.current
      );
      if (len === 0 || idx < len - EXPLORE_NEAR_END_SLOTS) return;
      paginationFailCountRef.current = 0;
      logExplorePagination({
        phase: "resume",
        feedMode,
        itemCount: len,
        activeIndex: idx,
      });
      setPaginationRetryEpoch(e => e + 1);
    };

    const onOnline = () => tryResumePagination();
    const onVisibility = () => {
      if (document.visibilityState === "visible") tryResumePagination();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      if (paginationRetryTimerRef.current) {
        clearTimeout(paginationRetryTimerRef.current);
        paginationRetryTimerRef.current = null;
      }
    };
  }, [feedMode]);

  /** Same-height snap slides: derive active index from scroll (stable vs partial IntersectionObserver batches). */
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || items.length === 0) return;

    let raf = 0;
    const commitIndex = () => {
      raf = 0;
      const len = itemsRef.current.length;
      if (len === 0) return;
      const idx = resolveExploreFeedScrollIndex(
        root,
        len,
        activeIndexRef.current
      );
      if (idx !== activeIndexRef.current) {
        activeIndexRef.current = idx;
        setActiveIndex(prev => (prev === idx ? prev : idx));
      }
      const nearEnd = len > 0 && idx >= len - EXPLORE_NEAR_END_SLOTS;
      metricsSuppressedRef.current =
        nearEnd || loadingMoreRef.current || endOfFeedRef.current;
      if (nearEnd) {
        setPaginationScrollEpoch(e => e + 1);
      }
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
    if (!feedSurfaceActive) return;

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
  }, [activeIndex, items, feedMode, feedSurfaceActive]);

  if (initialLoading) {
    return <ExploreFeedSkeleton />;
  }

  if (bootLoadFailed) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
        <p className="max-w-sm text-sm">
          We could not load the explore feed right now. Check your connection
          and try again.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            loadedQueryKeyRef.current = null;
            setBootLoadFailed(false);
            setInitialLoading(true);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    if (!bootSettled && feedMode === "trends") {
      return <ExploreFeedSkeleton />;
    }
    if (feedMode === "saves" && savesBlocked === null) {
      return <ExploreFeedSkeleton />;
    }
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
            <Link href="/explore">Browse trends</Link>
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
          <TipperEmailOtpSignInDialog
            open={signInOpen}
            onOpenChange={setSignInOpen}
            signInTitle="Sign in to view your saves feed"
            signupSurface="explore"
            onVerified={() => {
              setSavesBlocked(null);
              handleSaveSignInVerified();
            }}
          />
        </>
      );
    }
    if (feedMode === "community" && !hasExploreSession) {
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
          <TipperEmailOtpSignInDialog
            open={signInOpen}
            onOpenChange={setSignInOpen}
            signInTitle="Sign in to browse community clips"
            signupSurface="explore"
            onVerified={handleSaveSignInVerified}
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
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-black">
      <div className="pointer-events-none absolute top-3 left-3 z-[80]">
        <PlaybackReturnBackChip
          className="pointer-events-auto"
          isVisible={ctx => isDedicatedDiscoverReturnTo(ctx.returnTo)}
        />
      </div>
      <div
        data-testid="explore-feed-scroll"
        ref={scrollRef}
        className={cn(
          "h-full min-h-0 w-full max-w-[100vw] min-w-0 flex-1 touch-pan-y snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
          (isTipDrawerOpen || exploreCommentOpen) &&
            "pointer-events-none select-none"
        )}
      >
        {items.map((item, i) => {
          if (!isInReelVirtualWindow(i, activeIndex, items.length)) {
            return (
              <div
                key={item.id}
                data-explore-slide
                data-index={i}
                className="relative flex h-full min-h-0 w-full max-w-[100vw] min-w-0 shrink-0 snap-start snap-always flex-col bg-black"
                aria-hidden
              />
            );
          }

          return (
            <ExploreFeedSlideStage
              key={item.id}
              item={item}
              isMobile={isMobile}
            >
              {({
                layoutMode: slideLayoutMode,
                presentationVideoSize: slidePresentationVideoSize,
                fullPresentationFit: slideFullPresentationFit,
                isMetadataLoading: slideMetadataLoading,
                onPlayerAspectInfo,
              }) => {
                const slideTitlePlacement =
                  exploreReelTitlePlacement(slideLayoutMode);
                const dockHeightCss = exploreReelDockHeightCss(
                  slideLayoutMode,
                  i === activeIndex && reelEngageUnlocked
                );

                return (
                  <div
                    data-explore-slide
                    data-index={i}
                    data-explore-layout-mode={slideLayoutMode}
                    className="relative flex h-full min-h-0 w-full max-w-[100vw] min-w-0 shrink-0 snap-start snap-always flex-col bg-black"
                    style={
                      {
                        "--explore-reel-dock-h": dockHeightCss,
                      } as CSSProperties
                    }
                  >
                    {isInExplorePreloadWindow(i, activeIndex, items.length) ? (
                      <div
                        className={cn(
                          exploreReelStageClassName(slideLayoutMode),
                          "min-h-0 flex-1"
                        )}
                      >
                        <div
                          className={exploreReelVideoBandClassName(
                            slideLayoutMode
                          )}
                        >
                          <ExploreFeedSlideVideo
                            item={item}
                            slideIndex={i}
                            activeIndex={activeIndex}
                            activeIndexRef={activeIndexRef}
                            totalItems={items.length}
                            feedSurfaceActive={feedSurfaceActive}
                            layoutMode={slideLayoutMode}
                            presentationVideoSize={slidePresentationVideoSize}
                            fullPresentationFit={slideFullPresentationFit}
                            isMetadataLoading={slideMetadataLoading}
                            onPlayerAspectInfo={onPlayerAspectInfo}
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
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center text-sm">
                        <span className="inline-flex items-center gap-1">
                          {resolveExploreItemHostUsername(item) ? (
                            <button
                              type="button"
                              className="pointer-events-auto underline"
                              onPointerDown={e => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={e => {
                                e.stopPropagation();
                                openCreatorDrawer(
                                  resolveExploreItemHostUsername(item)!
                                );
                              }}
                            >
                              @{resolveExploreItemHostUsername(item)}
                            </button>
                          ) : (
                            <span>@{item?.host?.username}</span>
                          )}
                          {item?.title.substring(0, 15)}
                          {item?.title.length > 15 ? ".." : ""}
                          {item?.title.length > 15 ? (
                            <button
                              type="button"
                              aria-label="Open comments"
                              className="pointer-events-auto -ml-2 inline-flex items-center rounded p-1"
                              onPointerDown={e => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={e => {
                                e.stopPropagation();
                                openExploreCommentDrawer(true);
                              }}
                            >
                              <ArrowRight className="size-4" />
                            </button>
                          ) : null}
                        </span>
                      </div>
                    )}

                    {i === activeIndex ? (
                      <>
                        {activeChannelId != null &&
                        process.env.NEXT_PUBLIC_VIDEO_REQUESTS_ENABLED !==
                          "false" ? (
                          <div
                            className={exploreReelFeatureCardBannerClassName(
                              slideLayoutMode
                            )}
                          >
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
                        {slideTitlePlacement === "onVideo" ? (
                          <ExploreReelSlideTitle
                            item={item}
                            layoutMode={slideLayoutMode}
                            reelMuted={reelMuted}
                            setReelMuted={setReelMuted}
                            videoRef={videoRef}
                            setExploreCommentOpen={openExploreCommentDrawer}
                            active={active}
                            metrics={metrics}
                            metricsRestrictedCommunity={
                              metricsRestrictedCommunity
                            }
                            onOpenCreatorDrawer={openCreatorDrawer}
                            onOpenCommunityDrawer={openCommunityDrawer}
                            onPrefetchCreator={prefetchCreatorProfile}
                            onEngageUnlocked={() => setReelEngageUnlocked(true)}
                            className={exploreReelTitleOnVideoClassName(
                              slideLayoutMode
                            )}
                          />
                        ) : null}
                        {slideTitlePlacement === "aboveDock" ? (
                          <ExploreReelSlideTitle
                            item={item}
                            layoutMode={slideLayoutMode}
                            reelMuted={reelMuted}
                            setReelMuted={setReelMuted}
                            videoRef={videoRef}
                            setExploreCommentOpen={openExploreCommentDrawer}
                            active={active}
                            metrics={metrics}
                            metricsRestrictedCommunity={
                              metricsRestrictedCommunity
                            }
                            onOpenCreatorDrawer={openCreatorDrawer}
                            onOpenCommunityDrawer={openCommunityDrawer}
                            onPrefetchCreator={prefetchCreatorProfile}
                            onEngageUnlocked={() => setReelEngageUnlocked(true)}
                            className={exploreReelTitleAboveDockClassName(
                              slideLayoutMode
                            )}
                          />
                        ) : null}
                        {activeEventId ? (
                          <ImmersiveChannelActionsRail
                            eventId={activeEventId}
                            channelId={
                              activeChannelId != null
                                ? String(activeChannelId)
                                : null
                            }
                            videoTitle={
                              typeof active?.title === "string"
                                ? active.title
                                : ""
                            }
                            numOfTips={liveNumOfTips}
                            isSaved={isExploreChannelSaved}
                            saveBusy={saveBusy}
                            onSaveClick={() => void handleExploreSaveToggle()}
                            onCommentOpenChange={openExploreCommentDrawer}
                            onShareOpen={() => {
                              setExploreCommentMetricsRefreshKey(k => k + 1);
                              void scheduleEngagementPwaPromptFromPolicy();
                            }}
                            hideTipsChip={
                              typeof active?.event?.amountToRaise ===
                                "number" &&
                              active.event.amountToRaise > 0 &&
                              !isTipDrawerOpen
                            }
                            hideHostAndAudio
                            onEngageUnlocked={() => setReelEngageUnlocked(true)}
                            className={exploreReelActionsRailClassName(
                              slideLayoutMode
                            )}
                            iconButtonClassName={exploreReelRailIconButtonClassName(
                              slideLayoutMode
                            )}
                            iconClassName={exploreReelRailIconClassName(
                              slideLayoutMode
                            )}
                            stackClassName={exploreReelRailStackGapClassName(
                              slideLayoutMode
                            )}
                            tipsChipClassName={exploreReelRailTipsChipClassName(
                              slideLayoutMode
                            )}
                            shareUrl={buildContentShareUrl({
                              eventId: activeEventId,
                              channelId:
                                activeChannelId != null
                                  ? String(activeChannelId)
                                  : undefined,
                            })}
                            shareTitle={
                              typeof active?.title === "string" &&
                              active.title.trim()
                                ? active.title
                                : typeof active?.event?.eventName === "string"
                                  ? active.event.eventName
                                  : "Watch on Tipmanna"
                            }
                            videoTipCount={liveChannelNumOfTips}
                            eventRoomTipCount={liveNumOfTips}
                          />
                        ) : null}
                        {typeof active?.event?.amountToRaise === "number" &&
                        active.event.amountToRaise > 0 &&
                        !isTipDrawerOpen ? (
                          <div
                            className={exploreReelTipsProgressWrapperClassName(
                              slideLayoutMode
                            )}
                          >
                            <button
                              type="button"
                              title="View tips"
                              className={cn(
                                exploreReelTipsChipClassName(slideLayoutMode),
                                "pointer-events-auto"
                              )}
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
                        className={exploreReelDockClassName(slideLayoutMode)}
                      >
                        {reelEngageUnlocked ? (
                          <div
                            className={exploreReelDockScrubberClassName(
                              slideLayoutMode
                            )}
                          >
                            <ExploreReelScrubber
                              videoRef={videoRef}
                              layoutMode={slideLayoutMode}
                              active={
                                Boolean(feedSurfaceActive) &&
                                Boolean(activeEventId)
                              }
                            />
                          </div>
                        ) : null}
                        <div
                          className={exploreReelDockActionsClassName(
                            slideLayoutMode
                          )}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            className={exploreReelDockIconButtonClassName(
                              slideLayoutMode
                            )}
                            aria-label="Create video"
                            title="Create"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCreateDialogOpen(true);
                            }}
                          >
                            <Plus
                              className={exploreReelDockActionIconClassName(
                                slideLayoutMode
                              )}
                            />
                          </Button>
                          <div className="flex items-center">
                            <Button
                              type="button"
                              data-testid="explore-watch-tv"
                              className={exploreReelDockPrimaryButtonClassName(
                                slideLayoutMode
                              )}
                              onPointerEnter={() =>
                                prefetchWatchTvFromExplore(
                                  router,
                                  tvExploreSource,
                                  {
                                    eventVideoTypes: trendsFilters.eventTypes,
                                    language: trendsFilters.language,
                                    country: trendsFilters.country,
                                  }
                                )
                              }
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                openWatchTvFromExplore(router, tvExploreSource);
                              }}
                            >
                              Watch TV
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              className={exploreReelDockSecondaryButtonClassName(
                                slideLayoutMode
                              )}
                              onClick={() => setIsTipDrawerOpen(true)}
                            >
                              Engage
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            className={exploreReelDockIconButtonClassName(
                              slideLayoutMode
                            )}
                            aria-label="Comments"
                            title="Comments"
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              openExploreCommentDrawer(true);
                            }}
                          >
                            <MessageCircle
                              className={exploreReelDockActionIconClassName(
                                slideLayoutMode
                              )}
                            />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }}
            </ExploreFeedSlideStage>
          );
        })}
      </div>

      <CreateDialog
        openPopup={createDialogOpen}
        setOpenPopup={setCreateDialogOpen}
        onExploreLayer
      />

      {/* <CreateDialog
          openPopup={openPopup}
          setOpenPopup={setOpenPopup}
        /> */}

      {tipDrawerStripeMounted ? (
        <TippingElementsProvider
          tippingCharacters={tipPriceCatalog}
          enabled
          textTipUnitPrice={tipPres.textUnitPrice}
        >
          <TipDrawer
            key={playingVideoKey || activeEventId}
            open={isTipDrawerOpen}
            onOpenChange={setIsTipDrawerOpen}
            eventId={activeEventId}
            tippingCharacters={tipPriceCatalog}
            characterSets={characterSetsForDrawer}
            paymentSurface={
              feedMode === "community" ? "community_feed" : "explore_feed"
            }
            paymentCommunityId={
              active?.community?.id ? active.community.id : undefined
            }
            paymentChannelId={active?.id ?? null}
            getPaymentRestoreSnapshot={getExplorePaymentRestoreSnapshot}
            openWalletModalNonce={openWalletModalNonce}
            stackAboveImmersive
            textTipUnitPrice={tipPres.textUnitPrice}
            tipQuoteContext={tipPres.quoteCtx}
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
          videoTipCount={liveChannelNumOfTips}
          communityBankName={
            typeof active?.community?.name === "string"
              ? active.community.name
              : null
          }
        />
      ) : null}

      {activeEventId ? (
        <CommentDrawer
          isCommentDrawerOpen={exploreCommentOpen}
          setIsCommentDrawerOpen={openExploreCommentDrawer}
          metricsRefreshKey={exploreCommentMetricsRefreshKey}
          eventId={activeEventId}
          channelId={activeChannelId != null ? String(activeChannelId) : null}
          videoTitle={typeof active?.title === "string" ? active.title : ""}
          videoDescription={
            typeof (active as { description?: string } | undefined)
              ?.description === "string"
              ? String((active as { description: string }).description)
              : ""
          }
          numOfTips={liveNumOfTips}
          tippingCharacters={tipPriceCatalog as RoomCharacter[]}
          onContinueToTip={() => setIsTipDrawerOpen(true)}
          hostName={active?.event?.hostName ?? undefined}
          hostUsername={active?.event?.username ?? undefined}
          stackAboveImmersive
        />
      ) : null}

      <CreatorDrawer
        open={creatorDrawerOpen}
        onOpenChange={handleCreatorDrawerOpenChange}
        username={creatorDrawerUsername}
      />
      <CommunityDrawer
        open={communityDrawerOpen}
        onOpenChange={handleCommunityDrawerOpenChange}
        communityId={communityDrawerId}
      />
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in as a tipper to save videos"
        signupSurface="explore"
        onVerified={handleSaveSignInVerified}
      />
    </div>
  );
});
