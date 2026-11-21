"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import dynamic from "next/dynamic";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";
import { resolveTvScheduleEventId } from "@/lib/resolve-tv-schedule-event-id";
import { useTvEventTipCatalog } from "@/hooks/use-tv-event-tip-catalog";
import { useTipPresentation } from "@/hooks/use-tip-presentation";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { usePayerOriginAnimationRecovery } from "@/hooks/use-payer-origin-animation-recovery";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { useAutoDropTip } from "@/hooks/use-auto-drop-tip";
import { useVideoTipReminder } from "@/hooks/use-video-tip-reminder";
import type { RoomCharacter } from "@/types";

const CommentDrawer = dynamic(
  () =>
    import("../events/comment-drawer").then(m => ({
      default: m.CommentDrawer,
    })),
  { ssr: false }
);
const TipsDrawer = dynamic(
  () =>
    import("../events/tips-drawer").then(m => ({
      default: m.TipsDrawer,
    })),
  { ssr: false }
);

import {
  Volume2,
  VolumeX,
  CircleStop,
  Play,
  Pause,
  Maximize2,
  RectangleHorizontal,
  RectangleVertical,
  Bookmark,
  Share2,
  CircleAlert,
  MessageCircleMore,
  ChevronsUp,
  ArrowRight,
} from "lucide-react";

import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { writeTvPlaybackSnapshot } from "@/lib/tv-playback-session";
import {
  syncTvLooperAnalyticsContext,
  trackTvLooperVideoComplete,
  trackTvLooperVideoEncounter,
  trackTvLooperVideoEnd,
  trackTvLooperVideoStart,
} from "@/lib/analytics/tv-looper-analytics";
import { createTvLooperWatchDurationScheduler } from "@/lib/analytics/tv-looper-periodic-watch-duration";
import { useTvLooperPeriodicWatchDuration } from "@/lib/analytics/use-tv-looper-periodic-watch-duration";
import {
  trackTvSaveClick,
  trackTvShareClick,
  trackTvUserInteraction,
} from "@/lib/tvAnalytics";
import type { PaymentSurface } from "@/lib/analytics-types";
import { useTV } from "../tv-provider";
import { ChannelProgressBar } from "../events/channel-progress-bar";
import { SaveEventId } from "../events/save-event-id";
import Image from "next/image";
import {
  FacebookIcon,
  FacebookShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "next-share";
import { ShareCopyLinkControl } from "@/components/shared/share-copy-link-control";
import { getSavedVideosForTipper, getEventByIdAction } from "@/actions/events";
import { getExploreChannelMetricsAction } from "@/actions/contents";
import {
  formatSaveVideoError,
  isChannelSaved,
  normalizeSavedVideosList,
  toggleChannelSaveForUser,
} from "@/lib/save-video-client";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { animWarn } from "@/lib/animationDebug";
import { useMediaQuery } from "react-responsive";
import { cn } from "@/lib/utils";
import { SURFACE_MOBILE_MAX_PX } from "@/lib/surface-breakpoints";
import { useMobileVideoViewMode } from "@/hooks/use-mobile-video-view-mode";
import { useTvPaymentAnimationLayer } from "@/hooks/use-tv-payment-animation-layer";
import { tvPaymentAnimationLayerStyle } from "@/components/tv/tv-payment-animation-layer";
import { useVideoChromeAutoHide } from "@/hooks/use-video-chrome-auto-hide";
import {
  VideoSurfaceBadges,
  pickVideoSurfaceBadgeProps,
} from "@/components/video/video-surface-badges";
import { useSideChick } from "@/components/community/side-chick-provider";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { buildContentShareUrl } from "@/lib/public-video-url";
import {
  ImmersiveMediaTopBar,
  immersiveControlRailClassName,
  immersiveFullViewViewportClassName,
  immersiveMainRowClassName,
  immersiveMobileScrubberDockClassName,
  immersivePlayerStageClassName,
} from "@/components/media/immersive-media-shell";
import { TV_RAIL_Z_INDEX } from "@/lib/drawer-z-index";
import { tvTrace } from "@/lib/tvDebugLog";
import { getTvStartupTraceId, tvStartupEvent } from "@/lib/tv-startup-trace";
import {
  recordLooperCommitted,
  recordPlayerRenderRequested,
} from "@/lib/tv-youtube-bootstrap-trace";
import { isTvInitialLiveOffsetEmbedEnabled } from "@/lib/tv-feature-flags";
import { resolveBroadcastPosition } from "@/lib/tv/broadcastEngine";
import { computeInitialEmbedPosition } from "@/lib/tv-initial-live-offset-embed";
import { useTvPlayerControls } from "@/hooks/use-tv-player-controls";
import HomeTvPlayer from "./home-tv-player";
import { EnforcementPreNoticeOverlay } from "./enforcement-pre-notice-overlay";

/**
 * TvLooper renders the TvPlayer, local playback controls (play/pause, mute, seek),
 * tip stream + payment animations for the currently playing schedule item.
 */
export const HomeTvLooper = ({
  characters,
  playerLayout = "compact",
  analyticsSurface = "tv_looper",
  onContinueCommentToTip,
  onEngage,
  onFullViewChange,
  onRegisterExitFull,
  commentDrawerVideoTitle,
  commentDrawerVideoDescription,
  showSideRails = true,
}: {
  characters: RoomCharacter[];
  /** compact: legacy 420px column; wide: full-width player for desktop /tv */
  playerLayout?: "compact" | "wide";
  /** Defaults to tv_looper; use homepage_preview on the marketing homepage embed */
  analyticsSurface?: PaymentSurface;
  /** Optional: parent opens Stripe tip drawer after comment draft handoff from CommentDrawer. */
  onContinueCommentToTip?: () => void;
  /** Opens tip/engage drawer from full-view mobile scrubber dock. */
  onEngage?: () => void;
  /** Notifies parent when mobile full-view mode toggles (shell hides chrome). */
  onFullViewChange?: (isFullView: boolean) => void;
  /** Registers mobile exitFull for landscape close button in tv-interactive-shell. */
  onRegisterExitFull?: (exitFull: (() => void) | null) => void;
  commentDrawerVideoTitle?: string;
  commentDrawerVideoDescription?: string;
  showSideRails?: boolean;
}) => {
  const {
    items,
    currentIndex,
    mode,
    playerRef,
    goLive,
    enterLocalMode,
    onPlayerPause,
    onPlayerSeek,
    onVideoEnd,
    setPlayerPlayingState,
    setPlayerVisible,
    applyTabPlaybackSnapshotRestore,
    playingItemOverride,
    applyPendingPlaybackRestore,
    applyPendingAudioRestore,
    unregisterTvPlayer,
    reloadCurrentPlaybackAt,
    handleStartupPlayerError,
    notifyStartupPlayerPlaying,
    scheduleSourceCommunityId,
    initialPlaybackTarget,
    startupEmbedGeneration,
    broadcastEpoch,
    totalDuration,
    getSyncedNow,
    onInitialLiveOffsetEmbedCommitted,
    onInitialLiveOffsetEmbedConfirmed,
    livePreNotice,
    localPreNoticeSnapshot,
    restorePreNoticeLocal,
    isPreNoticeDismissed,
  } = useTV();

  useLayoutEffect(() => {
    recordLooperCommitted({
      looperKind: "mobile",
      source: scheduleSourceCommunityId ? "community" : "global",
      startupGeneration: startupEmbedGeneration,
      traceId: getTvStartupTraceId(),
    });
  }, []);

  const openEngageDrawer = onEngage ?? onContinueCommentToTip;

  const sideChick = useSideChick();
  const sideTvLogo = useMemo(() => {
    if (
      !sideChick.active ||
      !sideChick.activation?.customization?.tvLogoUrl ||
      !scheduleSourceCommunityId ||
      scheduleSourceCommunityId !== sideChick.activation.communityId
    ) {
      return null;
    }
    return sideChick.activation.customization.tvLogoUrl;
  }, [sideChick.active, sideChick.activation, scheduleSourceCommunityId]);

  const lastTrackedItemIdRef = useRef<string | null>(null);
  const userSeekedForCompleteRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const lastSegmentChannelIdRef = useRef<string | undefined>(undefined);
  const segmentStartMsRef = useRef(0);
  const watchDurationSchedulerRef = useRef(
    createTvLooperWatchDurationScheduler()
  );
  const videoErrorReloadsRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedContents, setSavedContents] = useState<unknown[]>([]);

  const {
    isPlaying,
    setIsPlaying,
    isMuted,
    setIsMuted,
    togglePlayPause,
    toggleMute,
    stopPlayer,
    onPlayerReady,
    notifyPlayerPlaying,
    notifyPlayerPaused,
    syncFromPlayer,
  } = useTvPlayerControls({
    playerRef,
    mode,
    enterLocalMode,
    setPlayerPlayingState,
    scheduleSourceCommunityId,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerAreaRef = useRef<HTMLDivElement | null>(null);
  /** Full-page payment overlays on mobile; confined to player on desktop web (match tv-page-client-wrapper). */
  const isMobileTv = useMediaQuery({ maxWidth: SURFACE_MOBILE_MAX_PX });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showShare, setShowShare] = useState(false);
  const [showCommentDrawer, setShowCommentDrawer] = useState(false);
  const [commentMetricsRefreshKey, setCommentMetricsRefreshKey] = useState(0);
  const [tipsListOpen, setTipsListOpen] = useState(false);

  const shareTitle = "Join me on TipManna TV";

  const current = playingItemOverride ?? (items[currentIndex] || items[0]);
  const scheduleItemDuration = useMemo(() => {
    const d = (current as { duration?: number } | undefined)?.duration;
    return typeof d === "number" && d > 0 ? d : 0;
  }, [current]);
  const isNotice = current?.segmentKind === "notice";
  const isPreNotice = isNotice && current?.noticePhase !== "post";
  const isPostNotice = isNotice && current?.noticePhase === "post";
  const showPreNoticeOverlay =
    (mode === "GLOBAL" && isPreNotice) ||
    (mode === "LOCAL" &&
      livePreNotice != null &&
      !isPreNoticeDismissed(livePreNotice.enforcementId));
  const lastPlayableUrlRef = useRef<string>("");

  useEffect(() => {
    const u = current?.channel?.url;
    if (!isNotice && u && extractYoutubeID(u)) {
      lastPlayableUrlRef.current = u;
    }
  }, [current?.id, current?.channel?.url, isNotice]);

  const bootstrapPlayableUrl = useMemo(() => {
    const row = items.find(it => {
      const u = (it as { channel?: { url?: string } }).channel?.url;
      return u && extractYoutubeID(u);
    }) as { channel?: { url?: string } } | undefined;
    return row?.channel?.url ?? "";
  }, [items]);

  const effectivePlayerUrl = isNotice
    ? lastPlayableUrlRef.current || bootstrapPlayableUrl
    : (current?.channel?.url ?? "");

  const candidate =
    (effectivePlayerUrl && extractYoutubeID(effectivePlayerUrl)
      ? effectivePlayerUrl
      : "") ||
    (isNotice ? lastPlayableUrlRef.current || bootstrapPlayableUrl : "");

  const playbackUrl = candidate && extractYoutubeID(candidate) ? candidate : "";

  const liveOffsetEmbed = useMemo(() => {
    if (
      !isTvInitialLiveOffsetEmbedEnabled() ||
      !initialPlaybackTarget ||
      mode !== "GLOBAL" ||
      isNotice ||
      !broadcastEpoch ||
      !totalDuration ||
      !items.length
    ) {
      return null;
    }
    return computeInitialEmbedPosition({
      t6Index: initialPlaybackTarget.selectedIndex,
      t6OffsetSeconds: initialPlaybackTarget.startOffsetSeconds,
      t6ResolvedAtPerformanceMs: initialPlaybackTarget.resolvedAtPerformanceMs,
      items,
      broadcastEpoch,
      totalDuration,
      nowMs: getSyncedNow(),
      performanceNowMs:
        typeof performance !== "undefined" ? performance.now() : Date.now(),
      extractVideoId: extractYoutubeID,
      resolvePosition: (scheduleItems, epoch, total, now) => {
        const pos = resolveBroadcastPosition(
          scheduleItems as Parameters<typeof resolveBroadcastPosition>[0],
          epoch,
          total,
          now
        );
        return {
          scheduleIndex: pos.scheduleIndex,
          offsetSeconds: pos.offsetSeconds,
        };
      },
    });
  }, [
    initialPlaybackTarget,
    mode,
    isNotice,
    broadcastEpoch,
    totalDuration,
    items,
    getSyncedNow,
  ]);

  const enableLiveOffsetEmbed = Boolean(
    liveOffsetEmbed && liveOffsetEmbed.videoId === extractYoutubeID(playbackUrl)
  );

  const effectiveEmbedPlaybackUrl = useMemo(() => {
    if (!liveOffsetEmbed || mode !== "GLOBAL" || isNotice) return playbackUrl;
    const item = items[liveOffsetEmbed.selectedIndex] as
      | { channel?: { url?: string } }
      | undefined;
    const url = item?.channel?.url;
    if (url && extractYoutubeID(url) === liveOffsetEmbed.videoId) return url;
    return playbackUrl;
  }, [liveOffsetEmbed, mode, isNotice, items, playbackUrl]);

  const enableLiveOffsetEmbedFinal = Boolean(
    liveOffsetEmbed &&
      liveOffsetEmbed.videoId === extractYoutubeID(effectiveEmbedPlaybackUrl)
  );

  useEffect(() => {
    setIsPlayerLoading(true);
  }, [startupEmbedGeneration]);

  useEffect(() => {
    tvTrace("playback", "playbackUrl_change", {
      surface: "tv-looper",
      playbackUrl: playbackUrl || null,
      videoId: playbackUrl ? extractYoutubeID(playbackUrl) : null,
      currentId: current?.id,
      mode,
      currentIndex,
    });
  }, [playbackUrl, current?.id, mode, currentIndex]);

  const overlayRemovedTracedRef = useRef(false);
  useEffect(() => {
    tvTrace("playback", "isPlayerLoading_change", {
      surface: "tv-looper",
      isPlayerLoading,
      currentId: current?.id,
    });
    if (!isPlayerLoading && !overlayRemovedTracedRef.current) {
      overlayRemovedTracedRef.current = true;
      const player = playerRef.current;
      const reason = isNotice
        ? "notice"
        : player?.isReady?.()
          ? "player_ready_or_playing"
          : "cleared";
      tvStartupEvent("player_overlay_removed", {
        canonicalMark: "T12",
        reason,
        data: { surface: "tv-looper" },
      });
    }
  }, [isPlayerLoading, current?.id, isNotice, playerRef]);

  useEffect(() => {
    if (!isPlayerLoading) return;
    const timeout = window.setTimeout(() => {
      setIsPlayerLoading(false);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [isPlayerLoading, startupEmbedGeneration]);

  const showPlaybackError =
    !isNotice && Boolean(current?.channel) && !playbackUrl.trim();

  const {
    isFullView,
    fullPresentationFit,
    fullLayoutToggleShowsPortraitIcon,
    immersiveLayout,
    enterFull,
    exitFull,
    toggleFullVariant,
  } = useMobileVideoViewMode({
    videoUrl: effectivePlayerUrl || current?.channel?.url,
    isMobile: isMobileTv,
    resetAnchor: current?.id,
  });

  const shellEmbedsFullView = Boolean(onFullViewChange);
  const { animationMountRef, paymentLayerMetrics, usePlayerBoundsLayer } =
    useTvPaymentAnimationLayer({
      playerAreaRef,
      isMobileTv,
      isFullView,
      layoutKey: `${current?.id ?? ""}:${currentIndex}:${isFullView}`,
    });

  useEffect(() => {
    if (!isMobileTv) {
      onFullViewChange?.(false);
      onRegisterExitFull?.(null);
      return;
    }
    onFullViewChange?.(isFullView);
    onRegisterExitFull?.(exitFull);
    return () => onRegisterExitFull?.(null);
  }, [isFullView, isMobileTv, onFullViewChange, onRegisterExitFull, exitFull]);

  const currentEventId = resolveTvScheduleEventId(current);
  const { tippingCharacters: videoTipCharacters } =
    useTvEventTipCatalog(currentEventId);
  const tipPres = useTipPresentation(
    currentEventId && currentEventId !== "notice" ? currentEventId : undefined,
    videoTipCharacters as RoomCharacter[],
    { paymentSurface: analyticsSurface }
  );
  const engageLabel = tipPres.sectionCtaLabel?.trim() || "Engage";
  const tipsAndPaymentsEnabled =
    Boolean(currentEventId) && currentEventId !== "notice" && !isNotice;
  const currentChannelId = current?.channel?.id;
  const scheduleEvent = current?.channel?.event;

  const tvHostFirstName =
    scheduleEvent?.hostName?.trim().split(/\s+/)[0] ??
    scheduleEvent?.hostName ??
    "Host";
  useVideoTipReminder({
    surface: "home_tv_looper",
    reminderFlagsOverride:
      analyticsSurface === "homepage_preview"
        ? { flash: false, inApp: false }
        : undefined,
    channelId:
      tipsAndPaymentsEnabled && currentChannelId != null
        ? String(currentChannelId)
        : null,
    eventId: tipsAndPaymentsEnabled ? currentEventId : "",
    reminders: (current?.channel as { reminders?: number[] } | undefined)
      ?.reminders,
    currentTimeSec: currentTime,
    hostFirstName: tvHostFirstName,
    videoTitle: current?.channel?.title ?? "this video",
    deepLinkUrl: typeof window !== "undefined" ? window.location.pathname : "/",
    onTipNow: () => openEngageDrawer?.(),
  });

  const channelFinancial = current?.channel as {
    amountRaised?: number;
    amountToRaise?: number;
    numOfTips?: number;
  };

  const isCommunityTv = Boolean(scheduleSourceCommunityId);

  const communityFundraisingEventId = useMemo(() => {
    if (!scheduleSourceCommunityId || !items.length) return "";
    for (const item of items) {
      const ch = item?.channel as
        | {
            eventId?: string;
            community?: { id?: string };
          }
        | undefined;
      if (
        ch?.community?.id === scheduleSourceCommunityId &&
        ch.eventId?.trim()
      ) {
        return ch.eventId.trim();
      }
    }
    return currentEventId;
  }, [scheduleSourceCommunityId, items, currentEventId]);

  type DisplayEventMeta = {
    amountRaised?: number;
    amountToRaise?: number;
    numOfTips?: number;
    showAmountRaisedOnVideos?: boolean;
    showViewCountOnVideos?: boolean;
    showEncounterOnVideos?: boolean;
  };

  const [displayEventMeta, setDisplayEventMeta] =
    useState<DisplayEventMeta | null>(null);
  const [channelViewCount, setChannelViewCount] = useState<number | null>(null);

  const fundraisingEventId = isCommunityTv
    ? communityFundraisingEventId || currentEventId
    : currentEventId;

  useEffect(() => {
    if (!fundraisingEventId) {
      setDisplayEventMeta(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getEventByIdAction(fundraisingEventId);
      if (cancelled || !res.success || !res.data) return;
      const ev = res.data as DisplayEventMeta;
      setDisplayEventMeta({
        amountRaised: typeof ev.amountRaised === "number" ? ev.amountRaised : 0,
        amountToRaise:
          typeof ev.amountToRaise === "number" ? ev.amountToRaise : 0,
        numOfTips: typeof ev.numOfTips === "number" ? ev.numOfTips : 0,
        showAmountRaisedOnVideos: ev.showAmountRaisedOnVideos,
        showViewCountOnVideos: ev.showViewCountOnVideos,
        showEncounterOnVideos: ev.showEncounterOnVideos,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [fundraisingEventId]);

  const showAmountRaisedOnVideos =
    displayEventMeta?.showAmountRaisedOnVideos ??
    (scheduleEvent as DisplayEventMeta | undefined)?.showAmountRaisedOnVideos;
  const showViewCountOnVideos =
    displayEventMeta?.showViewCountOnVideos ??
    (scheduleEvent as DisplayEventMeta | undefined)?.showViewCountOnVideos;
  const showEncounterOnVideos =
    displayEventMeta?.showEncounterOnVideos ??
    (scheduleEvent as DisplayEventMeta | undefined)?.showEncounterOnVideos;
  const showRaisedAmount = showAmountRaisedOnVideos !== false;
  const showViewCount = showViewCountOnVideos === true;
  const showEncounterCount = showEncounterOnVideos === true;

  useEffect(() => {
    if (!showViewCount) {
      setChannelViewCount(null);
      return;
    }
    const channelId = currentChannelId != null ? String(currentChannelId) : "";
    if (!channelId) {
      setChannelViewCount(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const r = await getExploreChannelMetricsAction(channelId);
      if (cancelled) return;
      if (
        r.success &&
        r.data &&
        typeof r.data === "object" &&
        "views" in r.data
      ) {
        const views = (r.data as { views?: number }).views;
        setChannelViewCount(typeof views === "number" ? views : null);
      } else if (
        r.success &&
        r.data &&
        typeof r.data === "object" &&
        "encounters" in r.data
      ) {
        const data = r.data as { views?: number; encounters?: number };
        const views =
          typeof data.views === "number" ? data.views : data.encounters;
        setChannelViewCount(typeof views === "number" ? views : null);
      } else {
        setChannelViewCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentChannelId, showViewCount]);

  const chromeHide = useVideoChromeAutoHide({
    resetKey: current?.id ?? null,
  });

  useEffect(() => {
    if (!showPlaybackError) return;
    console.error(
      "[TvLooper] Missing or invalid YouTube URL for schedule item",
      current?.id,
      effectivePlayerUrl
    );
    setIsPlayerLoading(false);
  }, [showPlaybackError, current?.id, effectivePlayerUrl]);

  const encounterLoggedForScheduleItemRef = useRef<string | null>(null);

  useEffect(() => {
    encounterLoggedForScheduleItemRef.current = null;
  }, [current?.id]);

  const tvAnalyticsCtx = useMemo(
    () => ({
      eventId: currentEventId || null,
      channelId: currentChannelId ?? null,
      analyticsSurface,
      communityId: scheduleSourceCommunityId ?? null,
    }),
    [
      currentEventId,
      currentChannelId,
      analyticsSurface,
      scheduleSourceCommunityId,
    ]
  );

  const emitEncounterWhenVideoLoads = useCallback(() => {
    if (!current?.id) return;
    if (encounterLoggedForScheduleItemRef.current === current.id) return;
    encounterLoggedForScheduleItemRef.current = current.id;
    void syncTvLooperAnalyticsContext(tvAnalyticsCtx).then(() => {
      trackTvLooperVideoEncounter(tvAnalyticsCtx, {
        mode,
        scheduleIndex: currentIndex,
        scheduleItemId: String(current.id),
      });
    });
  }, [current?.id, tvAnalyticsCtx, mode, currentIndex]);

  useEffect(() => {
    void syncTvLooperAnalyticsContext(tvAnalyticsCtx);
  }, [tvAnalyticsCtx]);

  useTvLooperPeriodicWatchDuration({
    isPlaying,
    tvAnalyticsCtx,
    mode,
    scheduler: watchDurationSchedulerRef.current,
  });

  useEffect(() => {
    userSeekedForCompleteRef.current = false;
  }, [currentIndex, current?.channel?.id]);

  useGlobalTipStream({
    eventId: currentEventId || undefined,
    enabled: tipsAndPaymentsEnabled,
    surface: "tv_looper",
  });
  usePaymentAnimationPlayer({
    eventId: currentEventId,
    characters: videoTipCharacters,
    enabled: tipsAndPaymentsEnabled,
    animationMount: isMobileTv && !isFullView ? undefined : animationMountRef,
    surface: "tv_looper",
  });
  usePayerOriginAnimationRecovery({
    eventId: currentEventId,
    paymentSurface: ["tv_looper", "community_tv_looper"],
    characters: videoTipCharacters,
    enabled: tipsAndPaymentsEnabled,
    animationMount: isMobileTv && !isFullView ? undefined : animationMountRef,
    surface: "tv_looper",
  });
  /** Always enabled: pending Stripe tip uses snapshot eventId when schedule is still loading. */
  useAutoDropTip(currentEventId, tipsAndPaymentsEnabled);

  const initialAmountRaised = isCommunityTv
    ? (displayEventMeta?.amountRaised ??
      scheduleEvent?.amountRaised ??
      channelFinancial?.amountRaised ??
      0)
    : (scheduleEvent?.amountRaised ?? channelFinancial?.amountRaised ?? 0);
  const initialNumOfTips = isCommunityTv
    ? (displayEventMeta?.numOfTips ??
      scheduleEvent?.numOfTips ??
      channelFinancial?.numOfTips ??
      0)
    : (scheduleEvent?.numOfTips ?? channelFinancial?.numOfTips ?? 0);

  const {
    amountRaised: liveAmountRaised,
    numOfTips: liveNumOfTips,
    channelNumOfTips: liveChannelNumOfTips,
  } = useEventRoomRealtime({
    eventId: fundraisingEventId,
    initialAmountRaised,
    initialNumOfTips,
    channelId: currentChannelId ? String(currentChannelId) : null,
    initialChannelNumOfTips:
      channelFinancial?.numOfTips ??
      (current?.channel as { numOfTips?: number } | undefined)?.numOfTips ??
      0,
    enabled: tipsAndPaymentsEnabled,
  });

  const progressAmountRaised = liveAmountRaised;
  const progressAmountToRaise =
    displayEventMeta?.amountToRaise ??
    scheduleEvent?.amountToRaise ??
    channelFinancial?.amountToRaise ??
    0;

  const videoTipCount = liveChannelNumOfTips;
  const eventRoomTipCount = scheduleEvent?.numOfTips ?? liveNumOfTips;

  const { user, token } = useSelector((state: RootState) => state.auth);
  const role = user?.role;

  useEffect(() => {
    if (!token) {
      setSavedContents([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const savedRes = await getSavedVideosForTipper(token);
      if (cancelled) return;
      setSavedContents(
        normalizeSavedVideosList(savedRes.success ? savedRes.data : [])
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const channelIdForShare = current?.channel?.id;
  const shareUrl =
    currentEventId && channelIdForShare
      ? buildContentShareUrl({
          eventId: currentEventId,
          channelId: channelIdForShare ? String(channelIdForShare) : undefined,
        })
      : getPublicAbsoluteUrl("/tv");

  useEffect(() => {
    if (isNotice) {
      setIsPlayerLoading(false);
      return;
    }
    if (!effectivePlayerUrl) return;
    videoErrorReloadsRef.current = 0;
  }, [isNotice, effectivePlayerUrl]);

  const handleVideoEnd = () => {
    const id = lastTrackedItemIdRef.current;
    const ch = lastSegmentChannelIdRef.current;
    if (id && segmentStartMsRef.current > 0) {
      const sec = (Date.now() - segmentStartMsRef.current) / 1000;
      trackTvLooperVideoEnd(tvAnalyticsCtx, id, sec, "ended", mode, ch);
      watchDurationSchedulerRef.current.flush(tvAnalyticsCtx);
      if (!userSeekedForCompleteRef.current) {
        trackTvLooperVideoComplete(tvAnalyticsCtx, id, { channelId: ch, mode });
      }
    }
    userSeekedForCompleteRef.current = false;
    lastTrackedItemIdRef.current = null;
    lastSegmentChannelIdRef.current = undefined;
    segmentStartMsRef.current = 0;
    watchDurationSchedulerRef.current.reset();
    onVideoEnd();
  };

  const handlePlayerError = (youtubeErrorCode: number) => {
    console.error(
      "[TvLooper] Playback error",
      current?.id,
      "code:",
      youtubeErrorCode
    );
    handleStartupPlayerError(youtubeErrorCode);
  };

  useEffect(() => {
    if (!current?.channel) return;
    if (!currentEventId) {
      animWarn(
        "[TvLooper] Missing event id on schedule item (defaultChannelEventId / channel.eventId); payment animations will not play"
      );
    }
  }, [current?.channel, currentEventId]);

  const snapshotCtxRef = useRef({
    mode,
    currentIndex,
    current,
    scheduleSourceCommunityId,
    playbackUrl,
  });
  snapshotCtxRef.current = {
    mode,
    currentIndex,
    current,
    scheduleSourceCommunityId,
    playbackUrl,
  };

  useEffect(() => {
    setPlayerVisible(true);
    return () => {
      const ctx = snapshotCtxRef.current;
      const player = playerRef.current;
      if (player?.isReady?.()) {
        try {
          player.pauseProgrammatic?.();
          player.mute();
        } catch {
          /* iframe may be tearing down */
        }
        const vid =
          extractYoutubeID(ctx.current?.channel?.url ?? "") ??
          extractYoutubeID(ctx.playbackUrl) ??
          null;
        writeTvPlaybackSnapshot({
          mode: ctx.mode,
          currentIndex: ctx.currentIndex,
          startSeconds: player.getCurrentTime(),
          videoId: vid,
          communityId: ctx.scheduleSourceCommunityId,
        });
      }
      setPlayerVisible(false);
      unregisterTvPlayer();
    };
  }, [setPlayerVisible, unregisterTvPlayer, playerRef]);

  // ---- Fullscreen detection ----
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(scheduleItemDuration);
    setIsSeeking(false);
  }, [current?.id, scheduleItemDuration]);

  // ---- Track current time & duration for seek bar ----
  useEffect(() => {
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || !player.isReady()) return;
      const dur = player.getDuration();
      if (dur > 0) setDuration(dur);
      if (!isSeeking) {
        setCurrentTime(player.getCurrentTime());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [playerRef, isSeeking]);

  const seekTo = (time: number) => {
    userSeekedForCompleteRef.current = true;
    trackTvUserInteraction("seek", "scrubber");
    setCurrentTime(time);
    const player = playerRef.current;
    if (!player || !player.isReady()) {
      pendingSeekTimeRef.current = time;
      onPlayerSeek(time);
      return;
    }
    pendingSeekTimeRef.current = null;
    player.seekTo(time, true);
  };

  const flushPendingSeek = useCallback(() => {
    const pending = pendingSeekTimeRef.current;
    if (pending == null) return;
    const player = playerRef.current;
    if (!player?.isReady()) return;
    pendingSeekTimeRef.current = null;
    player.seekTo(pending, true);
    setCurrentTime(pending);
  }, [playerRef]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const seekBarDuration = duration > 0 ? duration : scheduleItemDuration;
  const seekBarMax = seekBarDuration > 0 ? seekBarDuration : 1;
  const seekBarValue = Math.min(Math.max(0, currentTime), seekBarMax);

  const channelId = current?.channel?.id ? String(current.channel.id) : null;
  const isCurrentChannelSaved = channelId
    ? isChannelSaved(channelId, savedContents)
    : false;

  const handleSaveToggle = async () => {
    if (!token || user?.role === "VISITOR") {
      toast.error("Sign in as a tipper to save videos");
      return;
    }
    if (!channelId) {
      toast.error("No video channel selected");
      return;
    }
    const wasSaved = isChannelSaved(channelId, savedContents);
    const prevList = savedContents;
    const placeholder = { channelId, channel: { id: channelId } };
    if (wasSaved) {
      setSavedContents(p =>
        p.filter(s => {
          const row = s as {
            channelId?: string;
            channel?: { id?: string };
          };
          return String(row?.channelId ?? row?.channel?.id ?? "") !== channelId;
        })
      );
    } else {
      setSavedContents(p => [...p, placeholder]);
    }
    try {
      setIsSaving(true);
      const res = await toggleChannelSaveForUser({
        channelId,
        token,
        role,
        userId: user?.id,
      });
      if (res.success && res.data) {
        toast.success(
          res.data.toggledTo === "saved"
            ? "Added video to saves"
            : "Removed video from saves"
        );
        if (res.data.toggledTo === "saved") {
          const analyticsId =
            current?.id != null ? String(current.id) : channelId;
          trackTvSaveClick(analyticsId);
        }
        setCommentMetricsRefreshKey(k => k + 1);
        const fresh = await getSavedVideosForTipper(token);
        if (fresh.success) {
          setSavedContents(normalizeSavedVideosList(fresh.data));
        }
      } else {
        setSavedContents(prevList);
        toast.error(res.error ?? res.message ?? "Failed to update save");
      }
    } catch (err: unknown) {
      setSavedContents(prevList);
      toast.error(formatSaveVideoError(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!current) return null;

  const currentTitle = current.channel?.title || "";
  const channelBadgeProps = pickVideoSurfaceBadgeProps(
    current.channel as Parameters<typeof pickVideoSurfaceBadgeProps>[0],
    currentEventId || undefined
  );
  const fillViewport = isFullView || isFullscreen;
  const widePlayer = playerLayout === "wide" && !isMobileTv && !fillViewport;
  const useFixedFullViewChrome = isFullView && !shellEmbedsFullView;

  return (
    <div
      ref={containerRef}
      {...chromeHide.interactionProps}
      //   className={cn(
      //     "relative w-full",
      //     useFixedFullViewChrome && immersiveFullViewViewportClassName("tv"),
      //     isFullView &&
      //       shellEmbedsFullView &&
      //       "flex h-full min-h-0 w-full flex-col overflow-hidden bg-black text-white",
      //     fillViewport &&
      //       !isFullView &&
      //       "h-[100dvh] min-h-[100dvh] w-full max-w-none bg-black pt-[env(safe-area-inset-top,0px)] md:h-[min(70vh,680px)]",
      //     !fillViewport &&
      //       widePlayer &&
      //       "h-[min(56vh,640px)] w-full max-w-6xl md:h-[min(70vh,680px)]",
      //     !fillViewport &&
      //       !widePlayer &&
      //       (isMobileTv
      //         ? landscapeChrome
      //           ? "h-full min-h-0 w-full"
      //           : "h-full min-h-0 w-full px-2"
      //         : "h-[40vh] w-full px-2 lg:!h-[90vh]")
      //   )}
      className="relative h-[300px] w-full rounded-2xl lg:h-full"
    >
      {currentEventId ? <SaveEventId eventId={currentEventId} /> : null}
      {isFullView && (
        <ImmersiveMediaTopBar
          onClose={exitFull}
          title={currentTitle}
        />
      )}
      <div id="preview-animation-root" />

      <div
        className={cn(
          isFullView
            ? immersiveMainRowClassName(isFullView, isMobileTv, immersiveLayout)
            : "mt-2 -ml-2 flex size-full gap-2"
        )}
      >
        {/* Left control rail */}
        <div
          className={immersiveControlRailClassName(
            isFullView,
            isMobileTv,
            immersiveLayout
          )}
        >
          <button onClick={togglePlayPause}>
            {isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5" />
            )}
          </button>

          <button onClick={stopPlayer}>
            <CircleStop className="-ml-1 size-7 fill-black text-white" />
          </button>

          <button
            onClick={toggleMute}
            type="button"
          >
            {isMuted ? (
              <VolumeX
                className={`size-5 ${isMuted ? "text-destructive" : ""}`}
              />
            ) : (
              <Volume2 className="size-5" />
            )}
          </button>
        </div>

        {/* Player area */}
        <div
          ref={playerAreaRef}
          className={cn(
            immersivePlayerStageClassName(
              isFullView,
              isMobileTv,
              immersiveLayout
            ),
            !isFullView && "h-full min-h-0 w-full"
          )}
        >
          {(!isMobileTv || isFullView) && (
            <div
              className={`pointer-events-none absolute inset-0 overflow-hidden ${TV_RAIL_Z_INDEX}`}
            >
              <div
                id="global-animation-layer"
                ref={animationMountRef}
                style={tvPaymentAnimationLayerStyle(
                  paymentLayerMetrics,
                  usePlayerBoundsLayer
                )}
              />
            </div>
          )}
          {mode === "GLOBAL" && (
            <div
              className={cn(
                "bg-destructive absolute right-1 z-[25] p-1 text-xs font-medium text-white",
                isFullView && isMobileTv && immersiveLayout === "portrait_video"
                  ? "top-12"
                  : "top-1"
              )}
            >
              LIVE
            </div>
          )}

          {mode === "LOCAL" && (
            <button
              type="button"
              onClick={goLive}
              className={cn(
                "absolute right-1 z-10 bg-black/80 px-2 py-1 text-xs text-white",
                isFullView && isMobileTv && immersiveLayout === "portrait_video"
                  ? "top-12"
                  : "top-1"
              )}
            >
              Back to Live
            </button>
          )}

          {showSideRails && (
            <div
              className={`${isFullView ? `absolute top-1/2 right-7 items-center ${TV_RAIL_Z_INDEX} flex -translate-y-1/2 flex-col gap-2` : `absolute right-7 bottom-12 ${TV_RAIL_Z_INDEX} flex flex-col items-center gap-2`}`}
            >
              <button
                type="button"
                title={
                  isCurrentChannelSaved
                    ? "Remove video from saves"
                    : "Add video to saves"
                }
                onClick={() => {
                  if (!isSaving) void handleSaveToggle();
                }}
                disabled={isSaving}
                className={`pointer-events-auto rounded bg-black/50 p-1 text-white ${isSaving ? "opacity-50" : ""}`}
              >
                {isCurrentChannelSaved ? (
                  <Bookmark className="fill-moonstone-blue size-5" />
                ) : (
                  <Bookmark className="size-5" />
                )}
              </button>

              <span className="rounded bg-black/50 p-1">
                <Share2
                  className="size-5 text-white"
                  onClick={() => {
                    let willOpen = false;
                    setShowShare(prev => {
                      willOpen = !prev;
                      return willOpen;
                    });
                    if (willOpen && channelId) {
                      trackTvShareClick(channelId);
                      setCommentMetricsRefreshKey(k => k + 1);
                    }
                  }}
                />
                {showShare && (
                  <div className="absolute top-1/2 right-full z-[100] flex -translate-y-1/2 gap-2 rounded-md bg-white p-2 shadow-md">
                    <ShareCopyLinkControl url={shareUrl} />
                    <WhatsappShareButton
                      url={shareUrl}
                      title={shareTitle}
                    >
                      <WhatsappIcon
                        size={32}
                        round
                      />
                    </WhatsappShareButton>

                    <FacebookShareButton
                      url={shareUrl}
                      quote={shareTitle}
                    >
                      <FacebookIcon
                        size={32}
                        round
                      />
                    </FacebookShareButton>

                    <TwitterShareButton
                      url={shareUrl}
                      title={shareTitle}
                    >
                      <TwitterIcon
                        size={32}
                        round
                      />
                    </TwitterShareButton>
                  </div>
                )}
              </span>

              {/* Comment button */}
              <button
                type="button"
                className="cursor-pointer rounded bg-black/50 p-1"
                onClick={() => setShowCommentDrawer(true)}
              >
                <MessageCircleMore className="size-5 text-white" />
              </button>

              <CommentDrawer
                isCommentDrawerOpen={showCommentDrawer}
                setIsCommentDrawerOpen={setShowCommentDrawer}
                metricsRefreshKey={commentMetricsRefreshKey}
                eventId={currentEventId}
                channelId={
                  currentChannelId != null ? String(currentChannelId) : null
                }
                videoTitle={
                  commentDrawerVideoTitle ??
                  (typeof current?.channel?.title === "string"
                    ? current.channel.title
                    : "")
                }
                videoDescription={
                  commentDrawerVideoDescription ??
                  (typeof (
                    current?.channel as { description?: string } | undefined
                  )?.description === "string"
                    ? (current?.channel as { description: string }).description
                    : "")
                }
                numOfTips={liveNumOfTips}
                amountRaised={
                  showRaisedAmount ? Number(liveAmountRaised) : null
                }
                amountToRaise={
                  showRaisedAmount ? (progressAmountToRaise ?? null) : null
                }
                showViewCount={showViewCount}
                showEncounterCount={showEncounterCount}
                tippingCharacters={videoTipCharacters}
                onContinueToTip={onContinueCommentToTip}
                hostName={
                  typeof current?.channel?.hostName === "string"
                    ? current.channel.hostName
                    : undefined
                }
                hostUsername={
                  typeof current?.channel?.username === "string"
                    ? current.channel.username
                    : undefined
                }
                stackAboveImmersive
              />

              <TipsDrawer
                open={tipsListOpen}
                onOpenChange={setTipsListOpen}
                eventId={currentEventId}
                channelId={currentChannelId ? String(currentChannelId) : null}
                eventRoomTipCount={eventRoomTipCount}
                videoTipCount={videoTipCount}
              />
            </div>
          )}

          {!isNotice && showSideRails && (
            <div
              className={`${isFullView ? "absolute top-1/2 right-2 z-40 -translate-y-1/2" : "absolute right-2 bottom-12 z-40"}`}
            >
              {/* <button
                type="button"
                title="View tips"
                className="absolute -top-8 right-0 cursor-pointer rounded-md bg-black/70 p-1 text-xs font-medium whitespace-nowrap text-white"
                onClick={() => setTipsListOpen(true)}
              >
                {liveNumOfTips} tips
              </button> */}
              {showRaisedAmount ? (
                <ChannelProgressBar
                  amountToRaise={progressAmountToRaise}
                  amountRaised={progressAmountRaised}
                  eventId={fundraisingEventId}
                />
              ) : null}
              {showViewCount && typeof channelViewCount === "number" ? (
                <p className="mt-1 text-center text-[10px] font-medium text-white drop-shadow-md">
                  {channelViewCount} views
                </p>
              ) : null}
              {!sideTvLogo && showRaisedAmount ? (
                <Image
                  src="/icons/black-diamond.png"
                  alt="Black Diamond"
                  width={40}
                  height={40}
                  className="-mt-4 size-[14px]"
                />
              ) : null}
            </div>
          )}

          {!isNotice && sideTvLogo ? (
            <div className="pointer-events-none absolute bottom-3 left-3 z-40 max-w-[min(40vw,180px)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sideTvLogo}
                alt=""
                className="max-h-11 w-auto max-w-full object-contain drop-shadow-md"
              />
            </div>
          ) : null}

          {showPreNoticeOverlay ? (
            <EnforcementPreNoticeOverlay
              title={
                mode === "GLOBAL"
                  ? (current.channel?.title ?? "Program notice")
                  : (livePreNotice?.title ?? "Program notice")
              }
              remainingSec={livePreNotice?.remainingSec ?? 60}
              onReturnToLocal={
                mode === "LOCAL" && localPreNoticeSnapshot
                  ? restorePreNoticeLocal
                  : undefined
              }
              className={
                widePlayer || (fillViewport && isMobileTv)
                  ? "min-h-[200px]"
                  : ""
              }
            />
          ) : null}

          {isPostNotice ? (
            <div
              className={cn(
                "absolute inset-0 z-[35] flex flex-col items-center justify-center gap-4 bg-black/95 px-6 text-center",
                widePlayer || (fillViewport && isMobileTv)
                  ? "min-h-[200px]"
                  : ""
              )}
            >
              <p className="text-lg font-semibold text-white md:text-2xl">
                {current.channel?.title ?? "Program notice"}
              </p>
              <p className="text-sm text-white/80">
                Live schedule continues automatically after this notice.
              </p>
            </div>
          ) : null}

          {isPlayerLoading && !showPlaybackError && (
            <div
              className={cn(
                "absolute inset-0 z-50 flex animate-pulse items-center justify-center bg-gray-200 text-sm font-medium",
                widePlayer || (fillViewport && isMobileTv)
                  ? "h-full min-h-[200px] w-full"
                  : "h-[370px] w-full",
                isFullView &&
                  isMobileTv &&
                  immersiveLayout === "landscape_video" &&
                  "left-12",
                isFullView &&
                  isMobileTv &&
                  immersiveLayout === "portrait_video" &&
                  "left-0"
              )}
            >
              Loading video…
            </div>
          )}

          {showPlaybackError ? (
            <div
              className={cn(
                "absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center text-white",
                widePlayer || (fillViewport && isMobileTv)
                  ? "min-h-[200px]"
                  : ""
              )}
            >
              <CircleAlert
                className="size-10 text-amber-400"
                aria-hidden
              />
              <p className="max-w-sm text-sm font-medium">
                This schedule clip has no valid YouTube link. Playback was
                stopped so we don&apos;t fall back to placeholder content.
              </p>
              <p className="max-w-md text-xs text-white/65">
                Check the schedule entry or reconnect the linked channel URL.
              </p>
            </div>
          ) : playbackUrl ? (
            (() => {
              recordPlayerRenderRequested({
                startupGeneration: startupEmbedGeneration,
                source: scheduleSourceCommunityId ? "community" : "global",
                selectedIndex: currentIndex,
                hasPlaybackUrl: true,
                traceId: getTvStartupTraceId(),
              });
              return (
                <HomeTvPlayer
                  key={`tv-yt-${startupEmbedGeneration}`}
                  ref={
                    playerRef as React.Ref<
                      import("./home-tv-player").HomeTvPlayerRef
                    >
                  }
                  videoUrl={effectiveEmbedPlaybackUrl}
                  externallyControlled
                  autoplay
                  enableLiveOffsetEmbed={enableLiveOffsetEmbedFinal}
                  initialStartSeconds={
                    enableLiveOffsetEmbedFinal
                      ? liveOffsetEmbed!.startOffsetSeconds
                      : 0
                  }
                  startupGeneration={startupEmbedGeneration}
                  initialSelectedIndex={
                    enableLiveOffsetEmbedFinal
                      ? liveOffsetEmbed!.selectedIndex
                      : 0
                  }
                  embedSource={
                    scheduleSourceCommunityId ? "community" : "global"
                  }
                  embedReason={
                    liveOffsetEmbed?.rolledOver
                      ? "rollover_at_embed"
                      : "cold_start"
                  }
                  targetWasResolved={enableLiveOffsetEmbedFinal}
                  onInitialEmbedCommitted={onInitialLiveOffsetEmbedCommitted}
                  onInitialEmbedConfirmed={onInitialLiveOffsetEmbedConfirmed}
                  onReady={() => {
                    setIsPlayerLoading(false);
                    onPlayerReady();
                    applyTabPlaybackSnapshotRestore("player_ready");
                    flushPendingSeek();
                    setPlayerVisible(true);
                    emitEncounterWhenVideoLoads();
                  }}
                  onPlaybackReady={() => {
                    setIsPlayerLoading(false);
                    applyPendingPlaybackRestore();
                    applyPendingAudioRestore();
                    syncFromPlayer();
                    emitEncounterWhenVideoLoads();
                    const dur = playerRef.current?.getDuration() ?? 0;
                    if (dur > 0) setDuration(dur);
                  }}
                  onPlay={() => {
                    setIsPlayerLoading(false);
                    notifyPlayerPlaying();
                    notifyStartupPlayerPlaying();
                    applyPendingPlaybackRestore();
                    applyPendingAudioRestore();
                    syncFromPlayer();
                    const dur = playerRef.current?.getDuration() ?? 0;
                    if (dur > 0) setDuration(dur);
                    const id = current?.id as string | undefined;
                    if (!id) return;
                    if (id !== lastTrackedItemIdRef.current) {
                      if (
                        lastTrackedItemIdRef.current &&
                        segmentStartMsRef.current > 0
                      ) {
                        const prev = lastTrackedItemIdRef.current;
                        const sec =
                          (Date.now() - segmentStartMsRef.current) / 1000;
                        watchDurationSchedulerRef.current.flush(tvAnalyticsCtx);
                        trackTvLooperVideoEnd(
                          tvAnalyticsCtx,
                          prev,
                          sec,
                          "interrupted",
                          mode,
                          lastSegmentChannelIdRef.current
                        );
                      }
                      lastTrackedItemIdRef.current = id;
                      lastSegmentChannelIdRef.current = currentChannelId;
                      segmentStartMsRef.current = Date.now();
                      trackTvLooperVideoStart(
                        tvAnalyticsCtx,
                        id,
                        mode,
                        currentIndex,
                        currentChannelId
                      );
                      watchDurationSchedulerRef.current.bindSegment({
                        itemId: id,
                        channelId: currentChannelId,
                        mode,
                      });
                    }
                  }}
                  onPause={() => notifyPlayerPaused()}
                  onUserPause={onPlayerPause}
                  onUserSeek={onPlayerSeek}
                  onEnd={handleVideoEnd}
                  onPlayerError={handlePlayerError}
                  cover={fullPresentationFit === "cover"}
                  containFill={fullPresentationFit === "contain"}
                />
              );
            })()
          ) : null}

          {!isNotice ? (
            <VideoSurfaceBadges
              {...channelBadgeProps}
              position="top-right"
            />
          ) : null}

          <div
            className={cn(
              chromeHide.chromeTransitionClass,
              chromeHide.chromeOpacityClass,
              "absolute bottom-0 left-4 z-[10000] text-xs text-white sm:text-sm lg:bottom-16"
            )}
          >
            <div className="flex items-center gap-1">
              {currentTitle?.substring(0, 25)}{" "}
              {currentTitle?.length > 25 ? ".." : ""}{" "}
              {currentTitle?.length > 25 ? (
                <div
                  className="-ml-1 flex items-center border border-gray-400"
                  onClick={() => setShowCommentDrawer(true)}
                >
                  <ArrowRight className="size-3 cursor-pointer" />
                </div>
              ) : (
                ""
              )}
            </div>
          </div>

          <div
            className={cn(
              chromeHide.chromeTransitionClass,
              chromeHide.chromeOpacityClass,
              "absolute right-0 -bottom-4 left-4 z-[10000] w-[190px] lg:bottom-8 lg:w-[920px]"
            )}
          >
            <input
              type="range"
              min={0}
              max={seekBarMax}
              step={0.1}
              value={seekBarValue}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={e => setCurrentTime(parseFloat(e.target.value))}
              onMouseUp={e => {
                const time = parseFloat((e.target as HTMLInputElement).value);
                seekTo(time);
                setIsSeeking(false);
              }}
              onTouchEnd={e => {
                const time = parseFloat((e.target as HTMLInputElement).value);
                seekTo(time);
                setIsSeeking(false);
              }}
              className="accent-primary h-2 w-full rounded-full"
            />
          </div>

          <div
            className={cn(
              chromeHide.chromeTransitionClass,
              chromeHide.chromeOpacityClass,
              "absolute right-0 -bottom-8 left-4 z-[10000] w-[190px] lg:bottom-4 lg:w-[920px]"
            )}
          >
            <div className="mx-auto flex w-[190px] items-center justify-between text-[10px] text-white sm:text-xs lg:w-[920px]">
              <span>{formatTime(seekBarValue)}</span>{" "}
              <span>{formatTime(seekBarDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {isFullView && isMobileTv ? (
        <div className={immersiveMobileScrubberDockClassName(immersiveLayout)}>
          <div className="flex items-center gap-2 px-1">
            <div className="flex flex-1 flex-col gap-1">
              <input
                type="range"
                min={0}
                max={seekBarMax}
                step={0.1}
                value={seekBarValue}
                onMouseDown={() => setIsSeeking(true)}
                onTouchStart={() => setIsSeeking(true)}
                onChange={e => setCurrentTime(parseFloat(e.target.value))}
                onMouseUp={e => {
                  const time = parseFloat((e.target as HTMLInputElement).value);
                  seekTo(time);
                  setIsSeeking(false);
                }}
                onTouchEnd={e => {
                  const time = parseFloat((e.target as HTMLInputElement).value);
                  seekTo(time);
                  setIsSeeking(false);
                }}
                className="accent-primary h-1 min-w-0 flex-1 rounded-full bg-white/20"
              />
              <div className="-mt-1 flex justify-between px-1 text-xs text-white">
                <span>{formatTime(seekBarValue)}</span>
                <span>{formatTime(seekBarDuration)}</span>
              </div>
            </div>
            {openEngageDrawer ? (
              <button
                type="button"
                onClick={openEngageDrawer}
                className="mb-2 flex shrink-0 items-center gap-0.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-black shadow"
              >
                <ChevronsUp className="text-primary size-4" />
                {engageLabel} <ChevronsUp className="text-primary size-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
