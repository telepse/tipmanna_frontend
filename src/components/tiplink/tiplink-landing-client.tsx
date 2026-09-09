/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { useMediaQuery } from "react-responsive";
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronsUp,
  ChevronUp,
  ExternalLink,
  Info,
  MessageCircleMore,
  Share2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import type { TipLinkPublicPayload } from "@/actions/tiplink";
import { postTipLinkVisitAction } from "@/actions/tiplink";
import { TipSection } from "@/components/events/tip-section";
import VideoPlayer, {
  type VideoPlayerRef,
} from "@/components/events/video-player";
import { ProfileDrawer } from "@/components/tv/profile-drawer";
import { Button } from "@/components/ui/button";
import SignInDialog from "@/components/auth/sign-in-dialog";
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import {
  ImmersiveMediaTopBar,
  immersiveFullViewViewportClassName,
  immersiveMainRowClassName,
  immersiveMobileScrubberDockClassName,
  immersivePlayerStageClassName,
} from "@/components/media/immersive-media-shell";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { usePayerOriginAnimationRecovery } from "@/hooks/use-payer-origin-animation-recovery";
import { usePaymentPlaybackRestore } from "@/hooks/use-payment-playback-restore";
import { useAutoDropTip } from "@/hooks/use-auto-drop-tip";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { useTipPresentation } from "@/hooks/use-tip-presentation";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import { useMobileVideoViewMode } from "@/hooks/use-mobile-video-view-mode";
import { buildCreatorProfileSharePath } from "@/lib/creator-profile-url";
import { copyShareUrl } from "@/lib/copy-share-url";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { TV_RAIL_Z_INDEX } from "@/lib/drawer-z-index";
import { needsCreateHostAuth } from "@/lib/needs-create-host-auth";
import { startContentOnlyCreateJourney } from "@/lib/start-content-only-create-journey";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  setTvAnalyticsContext,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "@/lib/tvAnalytics";
import {
  formatSaveVideoError,
  toggleChannelSaveForUser,
} from "@/lib/save-video-client";
import type { RootState } from "@/redux/store";
import type { RoomCharacter } from "@/types";
import { cn } from "@/lib/utils";
import { getPrimaryOrigin } from "@/lib/site-config";
import { resolveTipLinkLocaleDisplay } from "@/lib/tiplink-locale-display";
import { resolveCreateDialogSignInSuccess } from "@/lib/create-dialog-signin-resume";
import { SaveHostToggleButton } from "@/components/events/save-host-toggle-button";
import { SURFACE_MOBILE_MAX_PX } from "@/lib/surface-breakpoints";
import {
  buildTipLinkStoreRows,
  TipLinkStoreIcon,
  type TipLinkStoreKey,
  type TipLinkStoreRow,
} from "@/components/tiplink/tiplink-store-icons";
import { TipLinkPlayerShell } from "@/components/tiplink/tiplink-player-shell";
import { TipLinkMetricsTicker } from "@/components/tiplink/tiplink-metrics-ticker";
import {
  TipLinkSocialIcon,
  tipLinkSocialAriaLabel,
} from "@/components/tiplink/tiplink-social-icons";
import { tipLinkGlobalStreamOptions } from "@/lib/tiplink-stream-options";
import { buildExploreVideoHref } from "@/lib/explore-video-navigation";

type TipLinkSignInPurpose = "create" | "saveVideo" | "saveHost";

const DOCK_WIDTH_MOBILE = 96;
const DOCK_HEIGHT_MOBILE = 54;
const DOCK_WIDTH_DESKTOP = 128;
const DOCK_HEIGHT_DESKTOP = 72;
const PIP_RESERVE_MOBILE = DOCK_WIDTH_MOBILE + 12;
const PIP_RESERVE_DESKTOP = DOCK_WIDTH_DESKTOP + 12;

const formatTime = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const TipDrawer = dynamic(
  () =>
    import("@/components/events/tip-drawer").then(m => ({
      default: m.TipDrawer,
    })),
  { ssr: false }
);
const CommentDrawer = dynamic(
  () =>
    import("@/components/events/comment-drawer").then(m => ({
      default: m.CommentDrawer,
    })),
  { ssr: false }
);
const TipsDrawer = dynamic(
  () =>
    import("@/components/events/tips-drawer").then(m => ({
      default: m.TipsDrawer,
    })),
  { ssr: false }
);

type Props = {
  payload: TipLinkPublicPayload;
  characters: any[];
  characterSets: any[];
  preview?: boolean;
};

export function TipLinkLandingClient({
  payload,
  characters,
  characterSets,
  preview = false,
}: Props) {
  const pathname = usePathname();
  const user = useSelector((s: RootState) => s.auth.user);
  const userRole = (user as { role?: string } | null)?.role;
  const userId = user?.id;
  const videoRef = useRef<VideoPlayerRef>(null);
  const playerAnchorRef = useRef<HTMLDivElement>(null);
  const navTickerRef = useRef<HTMLDivElement>(null);
  const stickyClusterRef = useRef<HTMLDivElement>(null);
  const miniDockTargetRef = useRef<HTMLDivElement>(null);
  const [isPlayerInView, setIsPlayerInView] = useState(true);
  const [dockRect, setDockRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);
  const [showCommentDrawer, setShowCommentDrawer] = useState(false);
  const [showTipsDrawer, setShowTipsDrawer] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInPurpose, setSignInPurpose] =
    useState<TipLinkSignInPurpose>("create");
  const [saveHostSignInToken, setSaveHostSignInToken] = useState(0);
  const [pendingCreateHref, setPendingCreateHref] = useState<string | null>(
    null
  );
  const pendingSaveVideoRef = useRef(false);
  const pendingSaveHostRef = useRef(false);
  const playbackTimeBeforeLayoutRef = useRef<number | null>(null);
  const [inlineRect, setInlineRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [mobileEnlargeRect, setMobileEnlargeRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isDesktopImmersive, setIsDesktopImmersive] = useState(false);

  const { eventId, channel, event, host, metrics, tipLink } = payload;
  const channelId = channel.id;
  const paymentChannelId = channelId;

  const [showFeaturedPlaylist, setShowFeaturedPlaylist] = useState(false);

  const isMobile = useMediaQuery({ maxWidth: SURFACE_MOBILE_MAX_PX });
  const isMobileLandscape =
    useMediaQuery({ query: "(orientation: landscape)" }) &&
    typeof window !== "undefined" &&
    window.innerWidth <= 768;

  const {
    isFullView,
    fullPresentationFit,
    immersiveLayout,
    enterFull,
    exitFull,
  } = useMobileVideoViewMode({
    videoUrl: channel.url,
    isMobile,
  });

  const isMobileEnlarge = isMobile && (isFullView || isMobileLandscape);
  const isDesktopEnlarge = isDesktopImmersive && !isMobile;
  const isEnlargeMode = isMobileEnlarge || isDesktopEnlarge;
  const showStickyHeader = !isDesktopEnlarge;
  const hideScrollContent = isEnlargeMode;
  const isImmersiveRoom = isEnlargeMode;
  const isDocked = !isPlayerInView && !isEnlargeMode;
  const isPlayerFloating = isEnlargeMode || isDocked;
  const hostFirstName =
    host.fullName.trim().split(/\s+/)[0] ||
    host.fullName.trim() ||
    host.username;
  const playerShellVariant = isImmersiveRoom
    ? "immersive"
    : isDocked
      ? "docked"
      : "inline";
  const stackImmersive = isImmersiveRoom;
  const playerPresentationFit = isDesktopEnlarge
    ? "cover"
    : isMobileEnlarge
      ? (fullPresentationFit ?? "contain")
      : "contain";

  const baseTipChars = Array.isArray(characters) ? characters : [];
  const baseTipSets = Array.isArray(characterSets) ? characterSets : [];

  const tipPres = useTipPresentation(eventId, baseTipChars as RoomCharacter[], {
    paymentSurface: "tiplink",
  });

  useGlobalTipStream(tipLinkGlobalStreamOptions(eventId));
  usePaymentAnimationPlayer({
    eventId,
    characters: tipPres.strip as RoomCharacter[],
    surface: "tiplink",
  });
  usePayerOriginAnimationRecovery({
    eventId,
    paymentSurface: "tiplink",
    characters: tipPres.strip as RoomCharacter[],
    surface: "tiplink",
  });
  usePaymentPlaybackRestore({
    paymentSurface: "tiplink",
    videoRef,
    currentChannelId: channelId,
    onMuteChange: setIsMuted,
  });
  useAutoDropTip(eventId, true);

  const { openWalletModalNonce } = useWalletTopupTipResume(
    eventId,
    setIsTipDrawerOpen
  );

  const {
    amountRaised: liveAmountRaised,
    numOfTips: liveNumOfTips,
    channelNumOfTips: liveChannelNumOfTips,
  } = useEventRoomRealtime({
    eventId,
    initialAmountRaised: event.amountRaised ?? 0,
    initialNumOfTips: event.numOfTips ?? 0,
    channelId,
    initialChannelNumOfTips: channel.numOfTips ?? 0,
  });

  const watchSegStartRef = useRef(0);
  const prevPlayingRef = useRef(false);

  useEffect(() => {
    initTvAnalyticsRuntime();
  }, []);

  useEffect(() => {
    if (!preview) {
      void postTipLinkVisitAction(tipLink.slug, pathname || tipLink.landingUrl);
    }
  }, [pathname, preview, tipLink.landingUrl, tipLink.slug]);

  useEffect(() => {
    if (!eventId || !channelId) return;
    void flushTvAnalytics().then(() => {
      setTvAnalyticsContext({
        eventId,
        channelId,
        surface: "tiplink",
        communityId: event.communityId,
      });
    });
  }, [channelId, event.communityId, eventId]);

  useEffect(() => {
    if (!isEnlargeMode) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isEnlargeMode]);

  useLayoutEffect(() => {
    if (!isMobileEnlarge) {
      setMobileEnlargeRect(null);
      return;
    }
    const updateMobileEnlargeRect = () => {
      const tickerH = stickyClusterRef.current?.offsetHeight ?? 120;
      setMobileEnlargeRect({
        top: tickerH,
        left: 0,
        width: window.innerWidth,
        height: Math.max(0, window.innerHeight - tickerH),
      });
    };
    updateMobileEnlargeRect();
    const observer = new ResizeObserver(updateMobileEnlargeRect);
    if (stickyClusterRef.current) {
      observer.observe(stickyClusterRef.current);
    }
    window.addEventListener("resize", updateMobileEnlargeRect);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMobileEnlargeRect);
    };
  }, [isMobileEnlarge]);

  useLayoutEffect(() => {
    if (isEnlargeMode || isDocked) {
      setInlineRect(null);
      return;
    }
    const anchor = playerAnchorRef.current;
    if (!anchor) return;

    const updateInlineRect = () => {
      const rect = anchor.getBoundingClientRect();
      setInlineRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updateInlineRect();
    const observer = new ResizeObserver(updateInlineRect);
    observer.observe(anchor);
    window.addEventListener("scroll", updateInlineRect, { passive: true });
    window.addEventListener("resize", updateInlineRect);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateInlineRect);
      window.removeEventListener("resize", updateInlineRect);
    };
  }, [isEnlargeMode, isDocked]);

  useLayoutEffect(() => {
    const saved = playbackTimeBeforeLayoutRef.current;
    if (saved == null) return;
    const player = videoRef.current;
    if (!player?.isReady()) return;
    const current = player.getCurrentTime();
    if (current < 1 && saved > 1) {
      player.seekTo(saved);
      if (isPlaying) player.play();
    }
    playbackTimeBeforeLayoutRef.current = null;
  }, [isEnlargeMode, isDocked, inlineRect, dockRect, isPlaying]);

  useEffect(() => {
    const anchor = playerAnchorRef.current;
    if (!anchor || !showStickyHeader || isEnlargeMode) {
      setIsPlayerInView(true);
      return;
    }

    const headerHeight = stickyClusterRef.current?.offsetHeight ?? 96;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPlayerInView(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: `-${headerHeight}px 0px 0px 0px` }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [showStickyHeader, isEnlargeMode]);

  useLayoutEffect(() => {
    if (!isDocked) {
      setDockRect(null);
      return;
    }

    const target = miniDockTargetRef.current;
    if (!target) return;

    const updateDockRect = () => {
      const rect = target.getBoundingClientRect();
      setDockRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updateDockRect();
    const observer = new ResizeObserver(updateDockRect);
    observer.observe(target);
    window.addEventListener("scroll", updateDockRect, { passive: true });
    window.addEventListener("resize", updateDockRect);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateDockRect);
      window.removeEventListener("resize", updateDockRect);
    };
  }, [isDocked, isMobile]);

  const emitEncounter = useCallback(() => {
    if (!eventId || !channelId) return;
    trackTvVideoEncounter(`tiplink-${tipLink.slug}`, {
      channelId,
      mode: "LOCAL",
      scheduleIndex: 0,
    });
  }, [channelId, eventId, tipLink.slug]);

  useEffect(() => {
    if (isPlaying && !prevPlayingRef.current) {
      trackTvVideoStart(channelId, "LOCAL", 0, channelId);
    }
    prevPlayingRef.current = isPlaying;
  }, [channelId, isPlaying]);

  useEffect(() => {
    if (!eventId || !channelId) return;
    if (!isPlaying) {
      if (watchSegStartRef.current > 0) {
        const sec = (Date.now() - watchSegStartRef.current) / 1000;
        watchSegStartRef.current = 0;
        if (sec > 0.3) {
          trackTvWatchDuration(
            channelId,
            Math.min(sec, 600),
            "LOCAL",
            channelId
          );
        }
      }
      return;
    }
    if (watchSegStartRef.current === 0) {
      watchSegStartRef.current = Date.now();
    }
  }, [channelId, eventId, isPlaying]);

  useEffect(() => {
    const interval = setInterval(() => {
      const player = videoRef.current;
      if (!player?.isReady()) return;
      const current = player.getCurrentTime();
      const dur = player.getDuration();
      if (dur > 0) setDuration(dur);
      if (!isSeeking) setCurrentTime(current);
    }, 100);
    return () => clearInterval(interval);
  }, [isSeeking]);

  const getPaymentPlaybackOffsetSec = useCallback(() => {
    const t = videoRef.current?.getCurrentTime();
    return typeof t === "number" && !Number.isNaN(t) ? t : null;
  }, []);

  const getWatchDurationBeforePayMs = useCallback(() => {
    const t = videoRef.current?.getCurrentTime() ?? 0;
    return Math.max(0, Math.floor(t * 1000));
  }, []);

  const applyUserSeek = useCallback((seekTo: number) => {
    videoRef.current?.seekTo(seekTo);
    setCurrentTime(seekTo);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    videoRef.current?.setMuted(next);
    setIsMuted(next);
  }, [isMuted]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) videoRef.current?.pause();
    else videoRef.current?.play();
  }, [isPlaying]);

  const handlePlayerSurfaceClick = useCallback(() => {
    if (isDocked) {
      playerAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    togglePlayPause();
  }, [isDocked, togglePlayPause]);

  const preservePlaybackBeforeLayout = useCallback(() => {
    const t = videoRef.current?.getCurrentTime();
    if (typeof t === "number" && !Number.isNaN(t) && t > 0) {
      playbackTimeBeforeLayoutRef.current = t;
    }
  }, []);

  const enterImmersive = useCallback(() => {
    preservePlaybackBeforeLayout();
    if (isMobile) {
      enterFull();
      return;
    }
    setIsDesktopImmersive(true);
  }, [enterFull, isMobile, preservePlaybackBeforeLayout]);

  const exitImmersive = useCallback(() => {
    preservePlaybackBeforeLayout();
    if (isMobile) {
      exitFull();
      return;
    }
    setIsDesktopImmersive(false);
  }, [exitFull, isMobile, preservePlaybackBeforeLayout]);

  const openSaveVideoSignIn = useCallback(() => {
    pendingSaveVideoRef.current = true;
    setSignInPurpose("saveVideo");
    setSignInOpen(true);
  }, []);

  const openSaveHostSignIn = useCallback(() => {
    pendingSaveHostRef.current = true;
    setSignInPurpose("saveHost");
    setSignInOpen(true);
  }, []);

  const countryDisplay = useMemo(() => {
    const resolved = resolveTipLinkLocaleDisplay({ channel, event });
    return resolved.flagUrl
      ? { flagUrl: resolved.flagUrl, flagCode: resolved.flagCode }
      : null;
  }, [channel, event]);

  const bannerSrc = useMemo(() => {
    if (tipLink.bannerUrl?.trim()) return tipLink.bannerUrl;
    const vid = extractYoutubeID(channel.url);
    return vid
      ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
      : "/default-event-image.jpg";
  }, [channel.url, tipLink.bannerUrl]);

  const shareUrl = useMemo(() => {
    const origin = getPrimaryOrigin();
    return `${origin}${tipLink.landingUrl}`;
  }, [tipLink.landingUrl]);

  const storeLinks = useMemo(
    (): TipLinkStoreRow[] =>
      buildTipLinkStoreRows({
        appleMusicUrl: tipLink.appleMusicUrl,
        spotifyUrl: tipLink.spotifyUrl,
        audiomackUrl: tipLink.audiomackUrl,
        tiktokUrl: tipLink.tiktokUrl,
        customLinkLabel: tipLink.customLinkLabel,
        customLinkUrl: tipLink.customLinkUrl,
        tipmannaExploreUrl: buildExploreVideoHref({
          videoId: channel.id,
          eventId,
        }),
      }),
    [channel.id, eventId, tipLink]
  );

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: channel.title, url: shareUrl });
        return;
      } catch {
        /* fall through */
      }
    }
    await copyShareUrl(shareUrl);
    toast.success("TipLink link copied");
  }, [channel.title, shareUrl]);

  const handleSave = useCallback(async () => {
    if (!userId || userRole === "VISITOR") {
      openSaveVideoSignIn();
      return;
    }
    try {
      const res = await toggleChannelSaveForUser({
        channelId,
        role: userRole,
        userId,
      });
      if (!res.success) {
        toast.error(res.error ?? res.message ?? "Could not save video");
        return;
      }
      setSaved(res.data?.toggledTo === "saved");
      toast.success(
        res.data?.toggledTo === "saved"
          ? "Saved to your list"
          : "Removed from saves"
      );
    } catch (err) {
      toast.error(formatSaveVideoError(err));
    }
  }, [channelId, openSaveVideoSignIn, userId, userRole]);

  const handleCreateYours = useCallback(() => {
    startContentOnlyCreateJourney({
      needsHostAuth: needsCreateHostAuth(user),
      openSignIn: (_intent, href) => {
        setSignInPurpose("create");
        setPendingCreateHref(href);
        setSignInOpen(true);
      },
      navigate: (href, options) => {
        if (options?.newTab) {
          window.open(href, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = href;
        }
      },
    });
  }, [user]);

  const tipDrawerMounted = isTipDrawerOpen || openWalletModalNonce > 0;

  const renderScrubber = (variant: "inline" | "immersive" | "landscape") => (
    <div
      className={cn(
        variant === "inline" && "space-y-2 px-3 pb-2",
        variant === "immersive" &&
          cn(
            "flex flex-col gap-2",
            immersiveMobileScrubberDockClassName(immersiveLayout)
          ),
        variant === "landscape" && "fixed bottom-4 left-0 w-full space-y-2 p-4"
      )}
    >
      {variant === "landscape" ? (
        <span className="line-clamp-1 text-sm font-semibold">
          {channel.title}
        </span>
      ) : null}
      <div
        className={cn(
          "flex items-center justify-between text-sm",
          (variant === "immersive" || variant === "landscape") && "text-white"
        )}
      >
        <button
          type="button"
          className="rounded-md bg-white/10 px-3 py-1"
          onClick={togglePlayPause}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="rounded-md bg-white/10 px-3 py-1"
          onClick={toggleMute}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        {!isImmersiveRoom && variant === "inline" ? (
          <button
            type="button"
            className="rounded-md bg-white/10 px-3 py-1"
            onClick={enterImmersive}
          >
            Enlarge
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "flex items-center gap-2",
          variant === "landscape" && "flex-row"
        )}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={e => {
            setIsSeeking(true);
            setCurrentTime(parseFloat(e.target.value));
          }}
          onMouseUp={e => {
            applyUserSeek(parseFloat((e.target as HTMLInputElement).value));
            setIsSeeking(false);
          }}
          onTouchEnd={e => {
            applyUserSeek(parseFloat((e.target as HTMLInputElement).value));
            setIsSeeking(false);
          }}
          className={cn(
            "accent-primary h-2 w-full flex-1 rounded-full",
            variant === "inline" ? "bg-white/20" : "bg-white/20"
          )}
        />
        {variant === "landscape" || variant === "immersive" ? (
          <button
            type="button"
            onClick={() => setIsTipDrawerOpen(true)}
            className="mb-0 flex shrink-0 items-center gap-0.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-white shadow"
          >
            <ChevronsUp className="text-primary size-4" />
            {tipPres.sectionCtaLabel?.trim() || "Engage"}
            <ChevronsUp className="text-primary size-4" />
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "flex justify-between text-xs",
          variant === "inline" ? "text-white/70" : "text-white/80"
        )}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );

  const dockFallback = isMobile
    ? { width: DOCK_WIDTH_MOBILE, height: DOCK_HEIGHT_MOBILE }
    : { width: DOCK_WIDTH_DESKTOP, height: DOCK_HEIGHT_DESKTOP };

  const playerPositionStyle = useMemo(() => {
    if (isDesktopEnlarge) return undefined;
    if (isMobileEnlarge && mobileEnlargeRect) {
      return mobileEnlargeRect;
    }
    if (isDocked) {
      if (dockRect) {
        return {
          top: dockRect.top,
          left: dockRect.left,
          width: dockRect.width,
          height: dockRect.height,
        };
      }
      return {
        top: (stickyClusterRef.current?.offsetHeight ?? 96) + 4,
        right: 12,
        width: dockFallback.width,
        height: dockFallback.height,
      };
    }
    if (inlineRect) {
      return {
        top: inlineRect.top,
        left: inlineRect.left,
        width: inlineRect.width,
        height: inlineRect.height,
      };
    }
    return undefined;
  }, [
    dockFallback.height,
    dockFallback.width,
    dockRect,
    inlineRect,
    isDesktopEnlarge,
    isDocked,
    isMobileEnlarge,
    mobileEnlargeRect,
  ]);

  const inlineScrubberVariant = isDocked ? null : "inline";
  const floatingScrubberVariant: "immersive" | "landscape" | null =
    isEnlargeMode
      ? isMobileLandscape && !isFullView
        ? "landscape"
        : "immersive"
      : null;

  const playerStage = (
    <TipLinkPlayerShell
      variant={playerShellVariant}
      className={cn(
        isImmersiveRoom
          ? immersivePlayerStageClassName(
              isFullView || isDesktopImmersive,
              isMobile,
              isDesktopImmersive && !isMobile
                ? "landscape_video"
                : immersiveLayout
            )
          : cn(
              "h-full w-full overflow-hidden",
              !isPlayerFloating && "relative aspect-video w-full"
            ),
        isMobileLandscape && !isFullView && "h-full min-h-0 flex-1"
      )}
    >
      <VideoPlayer
        ref={videoRef}
        videoUrl={channel.url}
        initialMuted={isMuted}
        onMuteStateChange={setIsMuted}
        onPlayStateChange={setIsPlaying}
        playbackActive
        fullPresentationFit={playerPresentationFit}
        onVideoLoaded={emitEncounter}
        className="pointer-events-none h-full w-full"
      />
      <button
        type="button"
        aria-label={
          isDocked
            ? "Scroll to video"
            : isPlaying
              ? "Pause video"
              : "Play video"
        }
        className="absolute inset-0 z-[50] cursor-pointer bg-transparent"
        onClick={handlePlayerSurfaceClick}
      />
      {isDocked && isPlaying ? (
        <span className="pointer-events-none absolute bottom-1 left-1 z-[55] flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/80">
          <span className="bg-primary size-1.5 animate-pulse rounded-full" />
          Live
        </span>
      ) : null}
      <div
        id="global-animation-layer"
        className={cn("pointer-events-none absolute inset-0", TV_RAIL_Z_INDEX)}
      />
      <div
        id="preview-animation-root"
        className="pointer-events-none absolute inset-0"
      />
    </TipLinkPlayerShell>
  );

  const useFixedPlayerLayout = isDesktopEnlarge || Boolean(playerPositionStyle);

  const renderPlayerBlock = () => (
    <div className="relative w-full">
      <div
        key="tiplink-player"
        className={cn(
          useFixedPlayerLayout ? "fixed" : "absolute inset-x-0 top-0 z-[1]",
          isEnlargeMode ? "z-[100]" : "z-[60]",
          isDesktopEnlarge && "inset-0 flex flex-col bg-black"
        )}
        style={playerPositionStyle}
      >
        {isDesktopEnlarge ? (
          <ImmersiveMediaTopBar
            onClose={exitImmersive}
            title={channel.title}
          />
        ) : null}
        <div
          className={cn(
            isImmersiveRoom &&
              cn(
                immersiveMainRowClassName(
                  isFullView,
                  isMobile,
                  isDesktopImmersive && !isMobile
                    ? "landscape_video"
                    : immersiveLayout
                ),
                "min-h-0 flex-1"
              ),
            !isImmersiveRoom && "w-full"
          )}
        >
          {playerStage}
          {floatingScrubberVariant
            ? renderScrubber(floatingScrubberVariant)
            : null}
        </div>
      </div>
      <div
        ref={playerAnchorRef}
        className="aspect-video w-full scroll-mt-[120px] rounded-2xl bg-black/25"
        aria-hidden={isPlayerFloating}
      />
      {!isPlayerFloating && inlineScrubberVariant
        ? renderScrubber(inlineScrubberVariant)
        : null}
      {channel.description && !isPlayerFloating ? (
        <button
          type="button"
          className="absolute top-4 right-4 z-[55] flex shrink-0 items-center gap-0.5 rounded-md bg-white/40 px-2 py-1 text-xs whitespace-nowrap text-black sm:text-sm"
          onClick={() => setShowDescription(true)}
        >
          <Info className="size-4" />
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="tiplink-landing-bg min-h-screen text-white">
        {showStickyHeader ? (
          <div
            ref={stickyClusterRef}
            className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                {isMobileEnlarge ? (
                  <button
                    type="button"
                    aria-label="Close enlarged video"
                    className="rounded-full border border-white/20 p-2"
                    onClick={exitImmersive}
                  >
                    <X className="size-5" />
                  </button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={handleCreateYours}
                >
                  Create Yours
                </Button>
                <button
                  type="button"
                  aria-label="Profile"
                  className="relative rounded-full border border-white/20 p-2"
                  onClick={() => setIsProfileDrawerOpen(true)}
                >
                  <UserRound className="size-5" />
                  <NotificationBadge
                    variant="dot"
                    className="-top-0.5 -right-0.5"
                  />
                </button>
              </div>
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold tracking-wide"
              >
                <h1 className="racing_sans_one text-lg sm:text-4xl">
                  <span className="text-primary">tip</span>manna
                </h1>
                <span className="text-sm text-white/70">link</span>
              </Link>
            </header>
            <div className="relative flex items-stretch">
              <div
                ref={navTickerRef}
                className="min-w-0 flex-1"
              >
                <TipLinkMetricsTicker
                  visits={metrics.pageVisits90d}
                  tips={liveNumOfTips}
                  shares={metrics.shares}
                  sectionCtaLabel={tipPres.sectionCtaLabel}
                  docked={isDocked}
                  pipReserveMobile={PIP_RESERVE_MOBILE}
                  pipReserveDesktop={PIP_RESERVE_DESKTOP}
                  onTipsClick={() => setShowTipsDrawer(true)}
                />
              </div>
              <div
                className={cn(
                  "flex shrink-0 items-center justify-end transition-[width,padding] duration-200 ease-out",
                  isDocked
                    ? "w-[108px] pr-3 md:w-[140px]"
                    : "w-0 overflow-hidden p-0"
                )}
                aria-hidden={!isDocked}
              >
                <div
                  ref={miniDockTargetRef}
                  className={cn(
                    "shrink-0",
                    isDocked
                      ? "h-[54px] w-[96px] md:h-[72px] md:w-[128px]"
                      : "hidden"
                  )}
                />
              </div>
            </div>
          </div>
        ) : null}

        {showStickyHeader && preview ? (
          <div className="bg-amber-500/20 px-4 py-2 text-center text-sm text-amber-100">
            Preview mode — not indexed publicly
          </div>
        ) : null}

        <main
          className={cn(
            "mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6",
            hideScrollContent &&
              "fixed inset-0 z-[100] max-w-none bg-black p-4 text-white"
          )}
        >
          {!hideScrollContent ? (
            <section
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
              id="tip-section"
              style={{ scrollMarginTop: "120px" }}
            >
              <TippingElementsProvider
                enabled={false}
                tippingCharacters={tipPres.strip as RoomCharacter[]}
                textTipUnitPrice={tipPres.textUnitPrice}
              >
                <TipSection
                  eventId={eventId}
                  tippingCharacters={tipPres.strip as RoomCharacter[]}
                  characterSets={baseTipSets}
                  paymentSurface="tiplink"
                  paymentChannelId={paymentChannelId}
                  getPlaybackOffsetSec={getPaymentPlaybackOffsetSec}
                  getWatchDurationBeforePayMs={getWatchDurationBeforePayMs}
                  textTipUnitPrice={tipPres.textUnitPrice}
                  sectionCtaLabel={tipPres.sectionCtaLabel}
                  payLabel={tipPres.payLabel}
                  tipQuoteContext={tipPres.quoteCtx}
                  buttonColor="white"
                  shadowStyle="shadow-[0px_0px_2px_2px_#000]"
                  tipLink={true}
                />
              </TippingElementsProvider>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-black/25 p-1">
            {renderPlayerBlock()}
          </section>

          {!hideScrollContent ? (
            <>
              <section className="space-y-3 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  {countryDisplay ? (
                    <img
                      src={countryDisplay.flagUrl}
                      alt={countryDisplay.flagCode ?? "Country"}
                      width={32}
                      height={24}
                      className="block h-6 w-8 object-cover"
                    />
                  ) : null}
                  <h1 className="text-2xl font-bold">{channel.title}</h1>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-gray flex h-auto flex-col items-center justify-center gap-1 border-t-2 border-white/20 bg-black/40! py-1.5 text-sm text-white/80! shadow-[0px_2px_0px_0px_#fff]"
                    onClick={() => setShowCommentDrawer(true)}
                  >
                    <MessageCircleMore className="mr-1 size-8 text-white/80" />{" "}
                    <span className="text-[10px] text-white/80">
                      {metrics.comments} Comments
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-gray flex h-auto flex-col items-center justify-center gap-1 border-t-2 border-white/20 bg-black/40! py-1.5 text-xs text-white/80! shadow-[0px_2px_0px_0px_#fff] sm:text-sm"
                    onClick={handleSave}
                  >
                    <Bookmark className="mr-1 size-8 text-white/80" />{" "}
                    <span className="text-[10px] text-white/80">
                      {metrics.saves} {saved ? "Saved" : "Save"}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex h-auto flex-col items-center justify-center gap-1 border-t-2 border-white/20 bg-black/40! py-1.5 text-xs text-white/80! shadow-[0px_2px_0px_0px_#fff] hover:bg-black/80 sm:text-sm"
                    onClick={handleShare}
                  >
                    <Share2 className="mr-1 size-8 text-white/80" />{" "}
                    <span className="text-[10px] text-white/80">
                      {metrics.shares} Share
                    </span>
                  </Button>
                </div>
              </section>

              <p className="text-xs text-white/70">
                Created by: {hostFirstName}{" "}
                <span className="text-white/40">@{host.username}</span>
              </p>

              {storeLinks.length > 0 ? (
                <section className="space-y-4">
                  <h5 className="text-primary text-sm">Also available on</h5>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {storeLinks.map(link =>
                      link.key === "tipmanna" ? (
                        <a
                          key={`${link.key}-${link.url}`}
                          href={link.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:border-primary/50 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/20 px-4 py-3 transition"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <TipLinkStoreIcon
                              storeKey={link.key as TipLinkStoreKey}
                            />
                            <span className="truncate text-white/80">
                              {link.label}
                            </span>
                          </span>
                          <span className="text-primary shrink-0 text-xs">
                            {link.verb}
                          </span>
                        </a>
                      ) : (
                        <a
                          key={`${link.key}-${link.url}`}
                          href={link.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:border-primary/50 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/20 px-4 py-3 transition"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {link.key !== "custom" ? (
                              <TipLinkStoreIcon
                                storeKey={link.key as TipLinkStoreKey}
                              />
                            ) : null}
                            <span className="truncate text-white/80">
                              {link.label}
                            </span>
                          </span>
                          <span className="text-primary shrink-0 text-xs">
                            {link.verb}
                          </span>
                        </a>
                      )
                    )}
                  </div>
                </section>
              ) : null}

              {tipLink.pitch ? (
                <section className="bg-primary/20 mt-6 overflow-hidden rounded-2xl border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between pr-2">
                    <h2 className="flex flex-col border-b border-white/10 px-4 py-3 tracking-wide text-white/80">
                      <span className="text-lg font-semibold uppercase">
                        {hostFirstName}&apos;s Pitch
                      </span>{" "}
                      <span className="text-xs text-white/70">
                        @{host.username}
                      </span>
                    </h2>

                    <a
                      href="#tip-section"
                      className="bg-primary inline-flex h-8 items-center justify-center rounded-md px-1.5 px-5 py-0.5 py-3 text-black has-[>svg]:px-2.5"
                    >
                      {tipPres.sectionCtaLabel?.trim() || "Engage"}
                    </a>
                  </div>

                  <div className="relative h-40 w-full">
                    <Image
                      src={bannerSrc}
                      alt=""
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover"
                      unoptimized
                    />
                    <div className="to-primary/15 absolute inset-0 bg-gradient-to-t from-black/85 via-black/25" />

                    {event.showAmountRaisedOnVideos !== false ? (
                      <div className="text-primary absolute right-2 bottom-0 text-sm">
                        {event.amountToRaise > 0
                          ? `£${liveAmountRaised.toFixed(2)} / £${event.amountToRaise.toFixed(2)} raised`
                          : `£${liveAmountRaised.toFixed(2)} raised`}{" "}
                        · {liveNumOfTips} tips{" "}
                      </div>
                    ) : null}
                  </div>
                  <p className="px-4 py-4 text-sm leading-relaxed font-medium text-white/95">
                    {tipLink.pitch}
                  </p>
                </section>
              ) : null}

              <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="mb-3 text-sm text-white/60">Connect with me</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={buildCreatorProfileSharePath(host.username)}
                    className="bg-primary/20 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                  >
                    <Image
                      src="/logos/tipmanna-t.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 shrink-0 rounded"
                    />
                    Tipmanna
                  </Link>
                  {tipLink.socials.slice(0, 2).map(social => (
                    <a
                      key={social.url}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={tipLinkSocialAriaLabel(social.platform)}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-white/20"
                    >
                      <TipLinkSocialIcon platform={social.platform} />
                    </a>
                  ))}
                </div>
              </section>

              {payload.featuredPlaylist ? (
                <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center justify-between">
                    <p className="mb-2 text-sm text-white/60">
                      Featured playlist ({payload?.featuredPlaylist ? 1 : 0})
                    </p>

                    <button
                      onClick={() =>
                        setShowFeaturedPlaylist(!showFeaturedPlaylist)
                      }
                    >
                      {showFeaturedPlaylist ? (
                        <ChevronUp className="size-4 text-white" />
                      ) : (
                        <ChevronDown className="size-4 text-white" />
                      )}
                    </button>
                  </div>

                  {showFeaturedPlaylist && (
                    <Link
                      href={`/playlist/${payload.featuredPlaylist.id}`}
                      target="_blank"
                      className="flex items-center gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10"
                    >
                      {payload.featuredPlaylist.bannerUrl ? (
                        <Image
                          src={payload.featuredPlaylist.bannerUrl}
                          alt=""
                          width={64}
                          height={64}
                          className="rounded-md object-cover"
                          unoptimized
                        />
                      ) : null}
                      <div>
                        <p className="font-semibold">
                          {payload.featuredPlaylist.name}
                        </p>
                        {payload.featuredPlaylist.description ? (
                          <p className="line-clamp-2 text-sm text-white/60">
                            {payload.featuredPlaylist.description}
                          </p>
                        ) : null}
                      </div>
                      <ExternalLink className="ml-auto size-4 text-white/50" />
                    </Link>
                  )}
                </section>
              ) : null}
            </>
          ) : null}
        </main>

        {/* TIPLINK PAGE FOOTER */}
        {showStickyHeader ? (
          <footer className="bg-primary/20 border-t border-white/10 px-4 py-8 text-center text-white backdrop-blur-xl">
            <p className="mb-4 text-lg font-semibold">
              Watch · {tipPres.sectionCtaLabel?.trim() || "Engage"} · Support
            </p>
            <Button
              variant="secondary"
              className="mb-6 rounded-full bg-black text-white"
              onClick={handleCreateYours}
            >
              Create Yours
            </Button>
            <p className="text-xs text-white/50">Powered by Tipmanna.tv</p>
          </footer>
        ) : null}

        {tipDrawerMounted ? (
          <TippingElementsProvider
            tippingCharacters={tipPres.strip as RoomCharacter[]}
            textTipUnitPrice={tipPres.textUnitPrice}
          >
            <TipDrawer
              open={isTipDrawerOpen}
              onOpenChange={setIsTipDrawerOpen}
              eventId={eventId}
              tippingCharacters={tipPres.strip as RoomCharacter[]}
              characterSets={baseTipSets}
              paymentSurface="tiplink"
              paymentChannelId={paymentChannelId}
              getPlaybackOffsetSec={getPaymentPlaybackOffsetSec}
              getWatchDurationBeforePayMs={getWatchDurationBeforePayMs}
              stackAboveImmersive={stackImmersive}
              openWalletModalNonce={openWalletModalNonce}
              textTipUnitPrice={tipPres.textUnitPrice}
              payLabel={tipPres.payLabel}
              tipQuoteContext={tipPres.quoteCtx}
            />
          </TippingElementsProvider>
        ) : null}

        <CommentDrawer
          isCommentDrawerOpen={showCommentDrawer}
          setIsCommentDrawerOpen={setShowCommentDrawer}
          eventId={eventId}
          channelId={channelId}
          videoTitle={channel.title}
          videoDescription={channel.description ?? undefined}
          numOfTips={liveNumOfTips}
          amountRaised={
            event.showAmountRaisedOnVideos !== false ? liveAmountRaised : null
          }
          amountToRaise={
            event.showAmountRaisedOnVideos !== false
              ? event.amountToRaise
              : null
          }
          showViewCount={event.showViewCountOnVideos === true}
          showEncounterCount={event.showEncounterOnVideos === true}
          tippingCharacters={tipPres.strip as RoomCharacter[]}
          onContinueToTip={() => setIsTipDrawerOpen(true)}
          hostName={host.fullName}
          hostUsername={host.username}
          stackAboveImmersive={stackImmersive}
        />

        <TipsDrawer
          open={showTipsDrawer}
          onOpenChange={setShowTipsDrawer}
          eventId={eventId}
          channelId={channelId}
          eventRoomTipCount={liveNumOfTips}
          videoTipCount={liveChannelNumOfTips ?? channel.numOfTips}
        />

        <ProfileDrawer
          isProfileDrawerOpen={isProfileDrawerOpen}
          setIsProfileDrawerOpen={setIsProfileDrawerOpen}
        />

        {showDescription && channel.description ? (
          <div className="fixed inset-0 z-[300] flex items-end bg-black/60 sm:items-center sm:justify-center">
            <div className="max-h-[80vh] w-full space-y-2 overflow-y-auto rounded-t-2xl bg-zinc-900 p-6 sm:max-w-lg sm:rounded-2xl">
              <h2 className="text-lg font-semibold">{channel.title}</h2>
              <p className="text-sm whitespace-pre-wrap text-white/80">
                {channel.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Subscribe to this creator</span>{" "}
                  <SaveHostToggleButton
                    hostId={host.id}
                    className="rounded-md border border-white/20 px-3 py-1.5 text-xs sm:text-sm"
                    onRequireSignIn={openSaveHostSignIn}
                    signInCompletedToken={saveHostSignInToken}
                  />
                </div>

                <p className="text-xs text-white/40">
                  Seen: {metrics.encounters}
                </p>
              </div>

              <Button
                className="mt-4 w-full"
                onClick={() => setShowDescription(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}

        <SignInDialog
          open={signInOpen}
          onOpenChange={open => {
            setSignInOpen(open);
            if (!open) {
              pendingSaveVideoRef.current = false;
              pendingSaveHostRef.current = false;
            }
          }}
          title={
            signInPurpose === "saveVideo"
              ? "Sign in to save videos"
              : signInPurpose === "saveHost"
                ? "Sign in to save hosts"
                : "Sign in to continue"
          }
          defaultUserType={signInPurpose === "create" ? "host" : "tipper"}
          allowInlineSignUp
          closeOnSuccess={false}
          showSignedInNotice={false}
          returnTo={pendingCreateHref ?? "/content-only"}
          signupSurface={
            signInPurpose === "create" ? "create_dialog" : "tiplink"
          }
          onSuccess={() => {
            setSignInOpen(false);
            if (pendingSaveVideoRef.current) {
              pendingSaveVideoRef.current = false;
              void handleSave();
              return;
            }
            if (pendingSaveHostRef.current) {
              pendingSaveHostRef.current = false;
              setSaveHostSignInToken(token => token + 1);
              return;
            }
            const resume = resolveCreateDialogSignInSuccess({
              intent: "type-picker-proceed",
              href: pendingCreateHref ?? "/content-only",
              hasPendingVideo: false,
            });
            if (resume.navigateTo) {
              window.open(resume.navigateTo, "_blank", "noopener,noreferrer");
            }
            setPendingCreateHref(null);
          }}
        />
      </div>
    </>
  );
}
