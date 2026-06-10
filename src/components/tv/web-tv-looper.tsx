"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { useAutoDropTip } from "@/hooks/use-auto-drop-tip";
import type { RoomCharacter } from "@/types";
import { CommentDrawer } from "../events/comment-drawer";
import { TipsDrawer } from "../events/tips-drawer";

import {
  Volume2,
  VolumeX,
  CircleStop,
  Play,
  Pause,
  Bookmark,
  Share2,
  CircleAlert,
  MessageCircleMore,
  Copy,
  Link,
  Check,
} from "lucide-react";

import { SaveHostToggleButton } from "../events/save-host-toggle-button";

import TvPlayer from "./tv-player";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  flushTvAnalytics,
  setTvAnalyticsContext,
  trackTvSaveClick,
  trackTvShareClick,
  trackTvUserInteraction,
  trackTvVideoComplete,
  trackTvVideoEnd,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
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
import { useVideoChromeAutoHide } from "@/hooks/use-video-chrome-auto-hide";
import { CommunityCBadge } from "@/components/community/community-c-badge";
import { useSideChick } from "@/components/community/side-chick-provider";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { buildContentShareUrl } from "@/lib/public-video-url";
import {
  ImmersiveMediaTopBar,
  immersiveControlRailClassName,
  immersiveFullViewViewportClassName,
  immersiveMainRowClassName,
  immersivePlayerStageClassName,
} from "@/components/media/immersive-media-shell";
import { TV_RAIL_Z_INDEX } from "@/lib/drawer-z-index";

/**
 * WebTvLooper renders the TvPlayer, local playback controls (play/pause, mute, seek),
 * tip stream + payment animations for the currently playing schedule item.
 */
export const WebTvLooper = ({
  characters,
  playerLayout = "compact",
  analyticsSurface = "tv_looper",
  onContinueCommentToTip,
  commentDrawerVideoTitle,
  commentDrawerVideoDescription,
}: {
  characters: RoomCharacter[];
  /** compact: legacy 420px column; wide: full-width player for desktop /tv */
  playerLayout?: "compact" | "wide";
  /** Defaults to tv_looper; use homepage_preview on the marketing homepage embed */
  analyticsSurface?: PaymentSurface;
  /** Optional: parent opens Stripe tip drawer after comment draft handoff from CommentDrawer. */
  onContinueCommentToTip?: () => void;
  commentDrawerVideoTitle?: string;
  commentDrawerVideoDescription?: string;
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
    playingItemOverride,
    applyPendingPlaybackRestore,
    scheduleSourceCommunityId,
  } = useTV();

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
  const lastSegmentChannelIdRef = useRef<string | undefined>(undefined);
  const segmentStartMsRef = useRef(0);
  const videoErrorReloadsRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  /** Match iframe default (mute:1) so autoplay works on cold load; user can unmute */
  const TV_MUTE_PREF_KEY = "tipmanna_tv_mute_pref";
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.sessionStorage.getItem(TV_MUTE_PREF_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [miniPlayerActive, setMiniPlayerActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedContents, setSavedContents] = useState<unknown[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerAreaRef = useRef<HTMLDivElement | null>(null);
  const animationMountRef = useRef<HTMLDivElement | null>(null);
  /** Full-page payment overlays on mobile; confined to player on desktop web (match tv-page-client-wrapper). */
  const isMobileTv = useMediaQuery({ maxWidth: SURFACE_MOBILE_MAX_PX });
  const [paymentAnimScale, setPaymentAnimScale] = useState(1);
  const [paymentViewport, setPaymentViewport] = useState({
    w: 1920,
    h: 1080,
  });
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
  const currentEventId = String(
    current?.defaultChannelEventId ?? current?.channel?.eventId ?? ""
  ).trim();
  const tipsAndPaymentsEnabled =
    Boolean(currentEventId) && currentEventId !== "notice" && !isNotice;
  const currentChannelId = current?.channel?.id;
  const scheduleEvent = current?.channel?.event;
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
  const showRaisedAmount = showAmountRaisedOnVideos !== false;
  const showViewCount = showViewCountOnVideos === true;

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
        "encounters" in r.data
      ) {
        const encounters = (r.data as { encounters?: number }).encounters;
        setChannelViewCount(typeof encounters === "number" ? encounters : null);
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

  const emitEncounterWhenVideoLoads = useCallback(() => {
    if (!current?.id) return;
    if (encounterLoggedForScheduleItemRef.current === current.id) return;
    encounterLoggedForScheduleItemRef.current = current.id;
    void flushTvAnalytics().then(() => {
      setTvAnalyticsContext({
        eventId: currentEventId || null,
        channelId: currentChannelId ?? null,
        surface: analyticsSurface,
        communityId: scheduleSourceCommunityId ?? null,
      });
    });
    trackTvVideoEncounter(`tv-surface-${analyticsSurface}`, {
      channelId: currentChannelId,
      mode,
      scheduleIndex: currentIndex,
    });
  }, [
    current?.id,
    currentEventId,
    currentChannelId,
    analyticsSurface,
    mode,
    currentIndex,
    scheduleSourceCommunityId,
  ]);

  useEffect(() => {
    void flushTvAnalytics().then(() => {
      setTvAnalyticsContext({
        eventId: currentEventId || null,
        channelId: currentChannelId ?? null,
        surface: analyticsSurface,
        communityId: scheduleSourceCommunityId ?? null,
      });
    });
  }, [
    currentEventId,
    currentChannelId,
    analyticsSurface,
    scheduleSourceCommunityId,
  ]);

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
    characters,
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

  const { amountRaised: liveAmountRaised, numOfTips: liveNumOfTips } =
    useEventRoomRealtime({
      eventId: fundraisingEventId,
      initialAmountRaised,
      initialNumOfTips,
      enabled: tipsAndPaymentsEnabled,
    });

  const progressAmountRaised = liveAmountRaised;
  const progressAmountToRaise =
    displayEventMeta?.amountToRaise ??
    scheduleEvent?.amountToRaise ??
    channelFinancial?.amountToRaise ??
    0;

  const videoTipCount =
    channelFinancial?.numOfTips ??
    (current?.channel as { numOfTips?: number } | undefined)?.numOfTips ??
    liveNumOfTips;
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
    setIsPlayerLoading(true);
    videoErrorReloadsRef.current = 0;
  }, [isNotice, effectivePlayerUrl]);

  const handleVideoEnd = () => {
    const id = lastTrackedItemIdRef.current;
    const ch = lastSegmentChannelIdRef.current;
    if (id && segmentStartMsRef.current > 0) {
      const sec = (Date.now() - segmentStartMsRef.current) / 1000;
      trackTvVideoEnd(id, sec, "ended", mode, ch);
      trackTvWatchDuration(id, sec, mode, ch);
      if (!userSeekedForCompleteRef.current) {
        trackTvVideoComplete(id, { channelId: ch, mode });
      }
    }
    userSeekedForCompleteRef.current = false;
    lastTrackedItemIdRef.current = null;
    lastSegmentChannelIdRef.current = undefined;
    segmentStartMsRef.current = 0;
    onVideoEnd();
  };

  const handlePlayerError = () => {
    const p = playerRef.current;
    if (!p?.isReady()) return;
    console.error(
      "[TvLooper] Playback error reload attempt",
      current?.id,
      effectivePlayerUrl
    );
    if (!effectivePlayerUrl) return;
    if (videoErrorReloadsRef.current >= 1) return;
    videoErrorReloadsRef.current += 1;
    const vid = extractYoutubeID(effectivePlayerUrl);
    if (vid) p.load(vid, Math.max(0, p.getCurrentTime()));
  };

  useEffect(() => {
    if (!current?.channel) return;
    if (!currentEventId) {
      animWarn(
        "[TvLooper] Missing event id on schedule item (defaultChannelEventId / channel.eventId); payment animations will not play"
      );
    }
  }, [current?.channel, currentEventId]);

  useEffect(() => {
    setPlayerPlayingState(isPlaying);
  }, [isPlaying, setPlayerPlayingState]);

  useLayoutEffect(() => {
    setPlayerVisible(true);
  }, [setPlayerVisible]);

  useEffect(() => {
    return () => setPlayerVisible(false);
  }, [setPlayerVisible]);

  // ---- Fullscreen detection ----
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // ---- Payment animation: scale virtual viewport to player column (desktop + mobile immersive) ----
  useEffect(() => {
    if (isMobileTv && !isFullView) return;
    const el = playerAreaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPaymentViewport({ w: vw, h: vh });
      setPaymentAnimScale(
        Math.min(rect.width / vw, rect.height / vh, 1) || 0.001
      );
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [currentEventId, currentIndex, isMobileTv, isFullView]);

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

  // ---- Tab visibility: pause/mute while hidden in LOCAL; clear flag when visible or GLOBAL ----
  useEffect(() => {
    if (mode === "GLOBAL") {
      setMiniPlayerActive(false);
      return;
    }
    setMiniPlayerActive(document.hidden);
    const onVisibility = () => setMiniPlayerActive(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mode]);

  useEffect(() => {
    if (mode === "GLOBAL") return;
    const handleBeforeUnload = () => setMiniPlayerActive(true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [mode]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !player.isReady()) return;
    if (mode === "GLOBAL") {
      if (isMuted) player.mute();
      else player.unmute();
      return;
    }
    if (miniPlayerActive) {
      player.pause();
      player.mute();
    } else {
      if (!isMuted) player.unmute();
      if (isPlaying) player.play();
    }
  }, [miniPlayerActive, isMuted, isPlaying, playerRef, mode]);

  // ---- Local controls (cosmetic -- do not affect broadcast state) ----
  const togglePlayPause = () => {
    const player = playerRef.current;
    if (!player || !player.isReady()) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player || !player.isReady()) return;
    if (isMuted) {
      player.unmute();
      setIsMuted(false);
      try {
        window.sessionStorage.setItem(TV_MUTE_PREF_KEY, "0");
      } catch {
        /* noop */
      }
    } else {
      player.mute();
      setIsMuted(true);
      try {
        window.sessionStorage.setItem(TV_MUTE_PREF_KEY, "1");
      } catch {
        /* noop */
      }
    }
  };

  const stopPlayer = () => {
    const player = playerRef.current;
    if (!player) return;
    if (mode === "GLOBAL") enterLocalMode("manual");
    player.stop();
    setIsPlaying(false);
  };

  const seekTo = (time: number) => {
    const player = playerRef.current;
    if (!player || !player.isReady()) return;
    userSeekedForCompleteRef.current = true;
    trackTvUserInteraction("seek", "scrubber");
    player.seekTo(time, true);
    setCurrentTime(time);
  };

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
    if (!token) {
      toast.error("Missing session");
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

  const [copied, setCopied] = useState(false);

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!current) return null;

  const currentTitle = current.channel?.title || "";
  const channelCommunity = (
    current.channel as { community?: { id: string; name: string } } | undefined
  )?.community;
  const fillViewport = isFullView || isFullscreen;
  const widePlayer = playerLayout === "wide" && !isMobileTv && !fillViewport;

  return (
    <div
      ref={containerRef}
      {...chromeHide.interactionProps}
      className="relative h-[60vh] w-full bg-black object-cover"
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
            : "flex h-full w-full gap-3"
        )}
      >
        {/* Player area */}
        <div
          ref={playerAreaRef}
          className={cn(
            immersivePlayerStageClassName(
              isFullView,
              isMobileTv,
              immersiveLayout
            ),
            !isFullView && "h-full min-h-0 w-full object-cover"
          )}
        >
          {(!isMobileTv || isFullView) && (
            <div
              className={`pointer-events-none absolute inset-0 overflow-hidden ${TV_RAIL_Z_INDEX}`}
            >
              <div
                id="global-animation-layer"
                ref={animationMountRef}
                style={{
                  width: paymentViewport.w,
                  height: paymentViewport.h,
                  transformOrigin: "top left",
                  transform: `scale(${paymentAnimScale})`,
                  position: "relative",
                }}
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

          <div
            className={`${isFullView ? `absolute top-1/2 right-8 items-center ${TV_RAIL_Z_INDEX} mt-2 flex -translate-y-1/2 flex-col gap-2` : `absolute right-10 bottom-16 ${TV_RAIL_Z_INDEX} flex flex-col items-center gap-2`}`}
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

            <SaveHostToggleButton channelId={channelId} />

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
                  {copied ? (
                    <>
                      <Check className="text-moonstone-blue size-3" />
                    </>
                  ) : (
                    <>
                      <Link
                        className="size-4"
                        onClick={handleCopyShareUrl}
                      />
                    </>
                  )}
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
              tippingCharacters={characters}
              onContinueToTip={onContinueCommentToTip}
            />

            <TipsDrawer
              open={tipsListOpen}
              onOpenChange={setTipsListOpen}
              eventId={currentEventId}
              channelId={currentChannelId ? String(currentChannelId) : null}
              eventRoomTipCount={liveNumOfTips}
              videoTipCount={liveNumOfTips}
            />
          </div>

          {!isNotice && (
            <div
              className={`${isFullView ? "absolute top-1/2 right-4 z-40 mt-2 -translate-y-1/2" : "absolute right-4 bottom-20 z-40"}`}
            >
              <button
                type="button"
                title="View tips"
                className="absolute -top-8 right-0 cursor-pointer rounded-md bg-black/70 p-1 text-xs font-medium whitespace-nowrap text-white"
                onClick={() => setTipsListOpen(true)}
              >
                {liveNumOfTips} tips
              </button>
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

          {isNotice && (
            <div
              className={cn(
                "absolute inset-0 z-[35] flex flex-col items-center justify-center gap-4 bg-black/95 px-6 text-center",
                widePlayer || (fillViewport && isMobileTv)
                  ? "min-h-[200px]"
                  : "",
                widePlayer ? "w-[900px]" : "w-[560px]"
              )}
            >
              <p className="text-lg font-semibold text-white md:text-2xl">
                {current.channel?.title ?? "Program notice"}
              </p>
              <p className="text-sm text-white/80">
                Live schedule continues automatically after this notice.
              </p>
            </div>
          )}

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
            <TvPlayer
              ref={playerRef as React.Ref<import("./tv-player").TvPlayerRef>}
              key="tv-player"
              videoUrl={playbackUrl}
              autoplay
              onReady={() => {
                setIsPlayerLoading(false);
                setPlayerVisible(true);
                emitEncounterWhenVideoLoads();
              }}
              onPlaybackReady={() => {
                setIsPlayerLoading(false);
                applyPendingPlaybackRestore();
                emitEncounterWhenVideoLoads();
                const dur = playerRef.current?.getDuration() ?? 0;
                if (dur > 0) setDuration(dur);
              }}
              onPlay={() => {
                setIsPlaying(true);
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
                    const sec = (Date.now() - segmentStartMsRef.current) / 1000;
                    trackTvVideoEnd(
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
                  trackTvVideoStart(id, mode, currentIndex, currentChannelId);
                }
              }}
              onPause={() => setIsPlaying(false)}
              onUserPause={onPlayerPause}
              onUserSeek={onPlayerSeek}
              onEnd={handleVideoEnd}
              onPlayerError={handlePlayerError}
              onMuteChange={muted => setIsMuted(muted)}
              cover={fullPresentationFit === "cover"}
              containFill={fullPresentationFit === "cover"}
            />
          ) : null}

          {!isNotice && channelCommunity?.id && channelCommunity?.name && (
            <CommunityCBadge
              community={{
                id: channelCommunity.id,
                name: channelCommunity.name,
              }}
              position="top-right"
            />
          )}

          <div className="absolute bottom-24 left-8 z-[20] truncate text-sm font-medium text-white">
            {currentTitle}
          </div>

          <div
            className={cn(
              chromeHide.chromeTransitionClass,
              chromeHide.chromeOpacityClass,
              "absolute right-2 bottom-16 left-8 z-[20]"
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
              className="accent-primary h-1 w-full rounded-full"
            />
          </div>

          {/* Bottom control rail */}
          <div className="roundeed-2xl absolute bottom-4 left-8 z-10 bg-black/80 p-2">
            <div className="flex items-center gap-4">
              <button onClick={togglePlayPause}>
                {isPlaying ? (
                  <Pause className="size-5 text-white" />
                ) : (
                  <Play className="size-5 text-white" />
                )}
              </button>

              <button onClick={stopPlayer}>
                <CircleStop className="-ml-1 size-7 text-white" />
              </button>

              <button onClick={toggleMute}>
                {isMuted ? (
                  <VolumeX className="size-5 text-white" />
                ) : (
                  <Volume2 className="size-5 text-white" />
                )}
              </button>
            </div>
          </div>

          <div
            className={cn(
              chromeHide.chromeTransitionClass,
              chromeHide.chromeOpacityClass,
              "absolute",
              isFullView && isMobileTv && immersiveLayout === "portrait_video"
                ? "right-2 bottom-12 left-2"
                : null,
              isFullView && isMobileTv && immersiveLayout === "landscape_video"
                ? "right-2 bottom-12 left-24"
                : null,
              (!isFullView || !isMobileTv) && "right-2 bottom-12 left-10"
            )}
          >
            <div className="flex items-center justify-between text-xs text-white">
              <span>{formatTime(seekBarValue)}</span>{" "}
              <span>{formatTime(seekBarDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Player Overlay (LOCAL mode only) */}
      {/* {miniPlayerActive && mode !== "GLOBAL" && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            width:
              typeof window !== "undefined" && window.innerWidth < 500
                ? 250
                : 310,
            height:
              typeof window !== "undefined" && window.innerWidth < 500
                ? 140
                : 174,
            zIndex: 9999,
            overflow: "hidden",
            background: "black",
          }}
        >
          <button
            onClick={() => setMiniPlayerActive(false)}
            className="absolute top-1 right-1 z-50 flex items-center justify-center rounded-full bg-white/80 p-1 text-black"
          >
            <X />
          </button>

          <TvPlayer
            key="pip-player"
            videoUrl={playbackUrl}
            autoplay
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onMuteChange={muted => setIsMuted(muted)}
            miniPlayerActive={true}
          />
        </div>
      )} */}
    </div>
  );
};
