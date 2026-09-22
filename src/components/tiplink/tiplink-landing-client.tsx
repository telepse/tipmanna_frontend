/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  JSX,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
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
  Maximize2,
  CircleStar,
  MessageCircleMore,
  Share2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import type { TipLinkPublicPayload } from "@/actions/tiplink";
import { getEventCharacterCatalogAction } from "@/actions/events";
import {
  getPublicTipLinkHydrateAction,
  getTipLinkPreviewHydrateAction,
  postTipLinkVisitAction,
} from "@/actions/tiplink";
import {
  mergeCharacterPools,
  overlayStripPrices,
  resolveTipDrawerPresentation,
} from "@/lib/resolve-tip-drawer-sets";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import { fetchPublicTipLinkHydrate } from "@/lib/tiplink-hydrate";
import { shouldLoadTipStripe } from "@/lib/should-load-tip-stripe";
import { VideoFeatureCardBanner } from "@/components/video-feature/video-feature-card-banner";
import { createFeatureCardOverlayPlaybackHandlers } from "@/lib/feature-card-overlay-playback";
import { TipSection } from "@/components/events/tip-section";
import VideoPlayer, {
  type VideoPlayerRef,
} from "@/components/events/video-player";
import { ProfileDrawer } from "@/components/tv/profile-drawer";
import { Button } from "@/components/ui/button";
import SignInDialog from "@/components/auth/sign-in-dialog";
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { immersiveMobileScrubberDockClassName } from "@/components/media/immersive-media-shell";
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
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { JoinCommunityModal } from "@/components/community/join-community-modal";
import { copyShareUrl } from "@/lib/copy-share-url";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  DRAWER_OVERLAY_Z_INDEX,
  DRAWER_Z_INDEX,
  TV_RAIL_Z_INDEX,
} from "@/lib/drawer-z-index";
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
import {
  SURFACE_MOBILE_MAX_PX,
  SURFACE_PHONE_LANDSCAPE_MEDIA,
} from "@/lib/surface-breakpoints";
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
import { formatTipLinkAttribution } from "@/lib/tiplink-attribution";
import {
  resolveTipLinkTickerMode,
  tipLinkTickerExtras,
} from "@/lib/tiplink-ticker-mode";
import {
  buildExploreVideoHref,
  buildTipLinkExploreHandoff,
  stashExplorePendingHandoff,
} from "@/lib/explore-video-navigation";
import { useVideoTipReminder } from "@/hooks/use-video-tip-reminder";
import { VideoTipReminderOverlay } from "@/components/events/video-tip-reminder-overlay";

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

export const TIPLINK_MONEY_FOR_MAX = 80;

export function formatTipLinkRaisedLine({
  moneyFor,
  amountRaised,
  amountToRaise,
  tips,
  showAmounts = true,
  onAmountClick,
}: {
  moneyFor?: string | null;
  amountRaised: number;
  amountToRaise: number;
  tips: number;
  showAmounts?: boolean;
  onAmountClick?: () => void;
}): JSX.Element | null {
  if (showAmounts === false) return null;

  const raised = `£${amountRaised.toFixed(2)}`;
  const amounts =
    amountToRaise > 0
      ? `${raised} / £${amountToRaise.toFixed(2)} raised`
      : `${raised} raised`;

  const purpose = moneyFor?.trim();
  const prefix = purpose ? `towards ${purpose} ` : "";

  return (
    <div className="flex flex-col gap-1 py-2">
      <button
        type="button"
        onClick={onAmountClick}
        className="hover:border-primary/50 inline-flex h-8 w-fit items-center justify-center rounded-md border border-white/15 bg-white/20 px-1 py-3 text-white"
      >
        {amounts}
      </button>

      <span className="text-xs text-white/70">
        {tips} tips received {prefix}
      </span>
    </div>
  );
}

type PlayerLayoutMode = "inline" | "dock" | "enlarge";

function normalizePlayerPosition(
  raw: CSSProperties,
  mode: PlayerLayoutMode
): CSSProperties {
  const style: CSSProperties = {
    top: raw.top,
    width: raw.width,
    height: raw.height,
  };
  if (mode === "dock" && raw.right != null) {
    style.right = raw.right;
    style.left = "auto";
  } else {
    style.left = raw.left ?? 0;
    style.right = "auto";
  }
  return style;
}

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
  const featureOverlayWasPlayingRef = useRef(false);
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
  const lastKnownByModeRef = useRef<
    Partial<Record<PlayerLayoutMode, CSSProperties>>
  >({});
  const [inlineRect, setInlineRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [enlargeRect, setEnlargeRect] = useState<{
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
  const community = payload.community ?? null;
  const coOwnerName = payload.coOwnerName ?? null;
  const isCommunityTipLink = Boolean(community?.id);
  const channelId = channel.id;
  const paymentChannelId = channelId;

  const [showFeaturedPlaylist, setShowFeaturedPlaylist] = useState(false);
  const [joinCommunityOpen, setJoinCommunityOpen] = useState(false);
  const [landscapeLayoutDismissed, setLandscapeLayoutDismissed] =
    useState(false);

  const isMobile = useMediaQuery({ maxWidth: SURFACE_MOBILE_MAX_PX });
  const isPhoneLandscape = useMediaQuery({
    query: SURFACE_PHONE_LANDSCAPE_MEDIA,
  });
  const isMobileSurface = isMobile || isPhoneLandscape;
  const showPhoneLandscapeImmersive =
    isPhoneLandscape && !landscapeLayoutDismissed;

  const {
    isFullView,
    fullPresentationFit,
    immersiveLayout,
    enterFull,
    exitFull,
  } = useMobileVideoViewMode({
    videoUrl: channel.url,
    isMobile: isMobileSurface,
    lockFullLandscape: showPhoneLandscapeImmersive,
  });

  const isMobileEnlarge =
    isMobileSurface && (isFullView || showPhoneLandscapeImmersive);
  const isDesktopEnlarge = isDesktopImmersive && !isMobileSurface;
  const isEnlargeMode = isMobileEnlarge || isDesktopEnlarge;
  const isLandscapeEnlarge = showPhoneLandscapeImmersive;
  const tickerMode = resolveTipLinkTickerMode({
    isLandscapeEnlarge,
    isEnlargeMode,
  });
  const tickerExtras = tipLinkTickerExtras(tickerMode);
  const showStickyHeader = !isLandscapeEnlarge;
  const hideScrollContent = isEnlargeMode;
  const isImmersiveRoom = isEnlargeMode;
  const isDocked = !isPlayerInView && !isEnlargeMode;
  const isPlayerFloating = isEnlargeMode || isDocked;
  const hostFirstName =
    host.fullName.trim().split(/\s+/)[0] ||
    host.fullName.trim() ||
    host.username;
  const attributionLabel = formatTipLinkAttribution({
    hostFirstName,
    communityName: isCommunityTipLink ? community?.name : null,
    coOwnerName,
  });
  const pitchVerified = isCommunityTipLink
    ? Boolean(community?.ownerVerified)
    : Boolean(host.creatorPayoutVerified);
  const pitchHeadingName = isCommunityTipLink
    ? community?.name?.trim() || hostFirstName.trim()
    : hostFirstName.trim();
  const playerShellVariant = isImmersiveRoom
    ? "immersive"
    : isDocked
      ? "docked"
      : "inline";
  const stackImmersive = isImmersiveRoom;
  const playerPresentationFit = isEnlargeMode
    ? isMobileEnlarge
      ? (fullPresentationFit ?? "contain")
      : "contain"
    : "contain";

  const playerLayoutMode: PlayerLayoutMode = isEnlargeMode
    ? "enlarge"
    : isDocked
      ? "dock"
      : "inline";

  const firstPaintSets = useMemo(
    () => (Array.isArray(characterSets) ? characterSets : []),
    [characterSets]
  );
  const stripTipChars = useMemo(() => {
    const parsed = parseEventCharacterCatalog(firstPaintSets);
    return parsed.tippingCharacters.length > 0
      ? parsed.tippingCharacters
      : Array.isArray(characters)
        ? characters
        : [];
  }, [characters, firstPaintSets]);

  const [drawerCatalogSets, setDrawerCatalogSets] =
    useState<any[]>(firstPaintSets);
  const [hydratedMetrics, setHydratedMetrics] = useState(payload.metrics);

  useEffect(() => {
    let cancelled = false;

    const applyHydrateCatalog = (
      rawSets: unknown[],
      metrics?: Partial<NonNullable<typeof payload.metrics>>
    ) => {
      const parsed = parseEventCharacterCatalog(rawSets ?? []);
      if (parsed.characterSets.length > 0) {
        setDrawerCatalogSets(parsed.characterSets);
      }
      if (metrics) {
        setHydratedMetrics(prev => ({
          ...prev,
          ...metrics,
        }));
      }
    };

    const run = async () => {
      if (preview) {
        const res = await getTipLinkPreviewHydrateAction(tipLink.id);
        if (cancelled) return;
        if (res.success && res.data) {
          applyHydrateCatalog(res.data.characterSets ?? [], res.data.metrics);
          return;
        }
        const catalog = await getEventCharacterCatalogAction(eventId);
        if (cancelled) return;
        if (catalog.success && catalog.data?.characterSets?.length) {
          applyHydrateCatalog(catalog.data.characterSets);
        }
        return;
      }

      let data = await fetchPublicTipLinkHydrate(tipLink.slug);
      if (!data) {
        const res = await getPublicTipLinkHydrateAction(tipLink.slug);
        if (res.success && res.data) {
          data = res.data;
        }
      }
      if (cancelled) return;
      if (data) {
        applyHydrateCatalog(data.characterSets ?? [], data.metrics);
        return;
      }

      const catalog = await getEventCharacterCatalogAction(eventId);
      if (cancelled) return;
      if (catalog.success && catalog.data?.characterSets?.length) {
        applyHydrateCatalog(catalog.data.characterSets);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [eventId, preview, tipLink.id, tipLink.slug]);

  const drawerCatalogChars = useMemo(() => {
    const parsed = parseEventCharacterCatalog(drawerCatalogSets);
    return parsed.tippingCharacters;
  }, [drawerCatalogSets]);

  const presentationBaseChars = useMemo(
    () => mergeCharacterPools(stripTipChars, drawerCatalogChars),
    [drawerCatalogChars, stripTipChars]
  );

  const tipPres = useTipPresentation(
    eventId,
    presentationBaseChars as RoomCharacter[],
    {
      paymentSurface: "tiplink",
      initialTipConfig: payload.tipConfig ?? null,
    }
  );

  const displayStrip = useMemo(
    () => overlayStripPrices(stripTipChars, tipPres.catalog as RoomCharacter[]),
    [stripTipChars, tipPres.catalog]
  );

  const { drawerSets: resolvedDrawerSets } = useMemo(
    () =>
      resolveTipDrawerPresentation(
        drawerCatalogSets,
        tipPres.catalog as RoomCharacter[],
        firstPaintSets,
        tipPres.eliteCharacterIds
      ),
    [
      drawerCatalogSets,
      tipPres.catalog,
      firstPaintSets,
      tipPres.eliteCharacterIds,
    ]
  );

  const drawerCatalog =
    (tipPres.catalog as RoomCharacter[]) ?? presentationBaseChars;
  const displayMetrics = hydratedMetrics;

  useGlobalTipStream(tipLinkGlobalStreamOptions(eventId));
  usePaymentAnimationPlayer({
    eventId,
    characters: displayStrip as RoomCharacter[],
    surface: "tiplink",
  });
  usePayerOriginAnimationRecovery({
    eventId,
    paymentSurface: "tiplink",
    characters: displayStrip as RoomCharacter[],
    surface: "tiplink",
  });
  usePaymentPlaybackRestore({
    paymentSurface: "tiplink",
    videoRef,
    currentChannelId: channelId,
    onMuteChange: setIsMuted,
  });
  useAutoDropTip(eventId, true);

  const { showFlashOverlay, handleTipNow, handleDismiss } = useVideoTipReminder(
    {
      surface: "tiplink",
      channelId,
      eventId,
      reminders: channel.reminders,
      currentTimeSec: currentTime,
      hostFirstName,
      videoTitle: channel.title,
      deepLinkUrl: `/l/${tipLink.slug}`,
      onTipNow: () => setIsTipDrawerOpen(true),
    }
  );

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
    const onOrientation = () => {
      const landscape =
        typeof window !== "undefined" &&
        window.matchMedia("(orientation: landscape)").matches;
      if (!landscape) {
        setLandscapeLayoutDismissed(false);
      }
    };
    window.addEventListener("orientationchange", onOrientation);
    return () => window.removeEventListener("orientationchange", onOrientation);
  }, []);

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
    if (!isEnlargeMode) {
      setEnlargeRect(null);
      return;
    }
    const updateEnlargeRect = () => {
      if (isLandscapeEnlarge) {
        const viewport = window.visualViewport;
        setEnlargeRect({
          top: 0,
          left: 0,
          width: Math.round(viewport?.width ?? window.innerWidth),
          height: Math.round(viewport?.height ?? window.innerHeight),
        });
        return;
      }
      const tickerH = stickyClusterRef.current?.offsetHeight ?? 120;
      setEnlargeRect({
        top: tickerH,
        left: 0,
        width: window.innerWidth,
        height: Math.max(0, window.innerHeight - tickerH),
      });
    };
    updateEnlargeRect();
    const observer = new ResizeObserver(updateEnlargeRect);
    if (stickyClusterRef.current) {
      observer.observe(stickyClusterRef.current);
    }
    window.addEventListener("resize", updateEnlargeRect);
    window.visualViewport?.addEventListener("resize", updateEnlargeRect);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateEnlargeRect);
      window.visualViewport?.removeEventListener("resize", updateEnlargeRect);
    };
  }, [isEnlargeMode, isLandscapeEnlarge]);

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

    const measureInView = () => {
      const headerBottom =
        stickyClusterRef.current?.getBoundingClientRect().bottom ?? 96;
      const anchorRect = anchor.getBoundingClientRect();
      setIsPlayerInView(anchorRect.bottom > headerBottom + 8);
    };

    const headerHeight = stickyClusterRef.current?.offsetHeight ?? 96;
    measureInView();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsPlayerInView(true);
        } else {
          measureInView();
        }
      },
      { threshold: 0, rootMargin: `-${headerHeight}px 0px 0px 0px` }
    );
    observer.observe(anchor);
    window.addEventListener("scroll", measureInView, { passive: true });
    window.addEventListener("resize", measureInView);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measureInView);
      window.removeEventListener("resize", measureInView);
    };
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
  }, [isDocked]);

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

  const scrollToInlineVideo = useCallback(() => {
    const anchor = playerAnchorRef.current;
    if (!anchor) return;
    const headerH = stickyClusterRef.current?.offsetHeight ?? 96;
    const top =
      anchor.getBoundingClientRect().top + window.scrollY - headerH - 8;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: isMobileSurface ? "auto" : "smooth",
    });
  }, [isMobileSurface]);

  const handlePlayerSurfaceClick = useCallback(() => {
    if (isDocked) {
      scrollToInlineVideo();
      return;
    }
    togglePlayPause();
  }, [isDocked, scrollToInlineVideo, togglePlayPause]);

  const preservePlaybackBeforeLayout = useCallback(() => {
    const t = videoRef.current?.getCurrentTime();
    if (typeof t === "number" && !Number.isNaN(t) && t > 0) {
      playbackTimeBeforeLayoutRef.current = t;
    }
  }, []);

  const enterImmersive = useCallback(() => {
    preservePlaybackBeforeLayout();
    if (isMobileSurface) {
      enterFull();
      return;
    }
    setIsDesktopImmersive(true);
  }, [enterFull, isMobileSurface, preservePlaybackBeforeLayout]);

  const exitImmersive = useCallback(() => {
    preservePlaybackBeforeLayout();
    if (isMobileSurface) {
      if (showPhoneLandscapeImmersive) {
        setLandscapeLayoutDismissed(true);
      } else if (isFullView) {
        exitFull();
      }
      return;
    }
    setIsDesktopImmersive(false);
  }, [
    exitFull,
    isFullView,
    isMobileSurface,
    preservePlaybackBeforeLayout,
    showPhoneLandscapeImmersive,
  ]);

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

  const tipLinkExploreHandoff = useMemo(
    () =>
      buildTipLinkExploreHandoff({
        channelId: channel.id,
        eventId,
        url: channel.url,
        title: channel.title,
        hostUsername: host.username,
        numOfTips: channel.numOfTips,
        amountRaised: event.amountRaised,
        amountToRaise: event.amountToRaise,
      }),
    [
      channel.id,
      channel.numOfTips,
      channel.title,
      channel.url,
      event.amountRaised,
      event.amountToRaise,
      eventId,
      host.username,
    ]
  );

  const tipLinkExploreHref = useMemo(
    () => buildExploreVideoHref(tipLinkExploreHandoff),
    [tipLinkExploreHandoff]
  );

  const storeLinks = useMemo(
    (): TipLinkStoreRow[] =>
      buildTipLinkStoreRows({
        appleMusicUrl: tipLink.appleMusicUrl,
        spotifyUrl: tipLink.spotifyUrl,
        audiomackUrl: tipLink.audiomackUrl,
        tiktokUrl: tipLink.tiktokUrl,
        customLinkLabel: tipLink.customLinkLabel,
        customLinkUrl: tipLink.customLinkUrl,
        tipmannaExploreUrl: tipLinkExploreHref,
      }),
    [tipLink, tipLinkExploreHref]
  );

  const handleOpenTipLinkExplore = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      stashExplorePendingHandoff(tipLinkExploreHandoff);
      window.open(tipLinkExploreHref, "_blank", "noopener,noreferrer");
    },
    [tipLinkExploreHandoff, tipLinkExploreHref]
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

  const drawerOpen = isTipDrawerOpen || openWalletModalNonce > 0;
  const drawerStripeEnabled = shouldLoadTipStripe({
    previewMode: preview,
    drawerOpen,
  });
  const tipDrawerMounted = drawerOpen;

  const renderScrubber = (
    variant: "inline" | "immersive" | "landscape",
    overlay = false
  ) => (
    <div
      className={cn(
        variant === "inline" && "space-y-2 px-3 pb-2",
        variant === "immersive" &&
          (overlay
            ? "absolute inset-x-0 bottom-0 z-[55] flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2 pt-4 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]"
            : cn(
                "flex flex-col gap-2",
                immersiveMobileScrubberDockClassName(immersiveLayout)
              )),
        variant === "landscape" &&
          (overlay
            ? "absolute inset-x-0 bottom-0 z-[55] space-y-2 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pt-8"
            : "fixed bottom-4 left-0 w-full space-y-2 p-4")
      )}
    >
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
            className="rounded-md border border-white/20 bg-white/10 p-1"
            onClick={enterImmersive}
            aria-label="Enlarge video"
          >
            <Maximize2 className="size-4" />
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
            className={cn(
              "mb-0 flex shrink-0 items-center gap-0.5 rounded-full bg-white/90 font-semibold text-black shadow",
              isDesktopEnlarge ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs"
            )}
          >
            <ChevronsUp
              className="text-primary size-4"
              aria-hidden
            />
            {tipPres.sectionCtaLabel?.trim() || "Engage"}
            <ChevronsUp
              className="text-primary size-4"
              aria-hidden
            />
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

  const dockFallback = isMobileSurface
    ? { width: DOCK_WIDTH_MOBILE, height: DOCK_HEIGHT_MOBILE }
    : { width: DOCK_WIDTH_DESKTOP, height: DOCK_HEIGHT_DESKTOP };

  const playerPositionStyle = useMemo((): CSSProperties => {
    let next: CSSProperties | null = null;

    if (playerLayoutMode === "enlarge") {
      if (enlargeRect) {
        next = enlargeRect;
      } else if (isLandscapeEnlarge) {
        const viewport = window.visualViewport;
        next = {
          top: 0,
          left: 0,
          width: Math.round(viewport?.width ?? window.innerWidth),
          height: Math.round(viewport?.height ?? window.innerHeight),
        };
      } else {
        const tickerH = stickyClusterRef.current?.offsetHeight ?? 120;
        next = {
          top: tickerH,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, window.innerHeight - tickerH),
        };
      }
    } else if (playerLayoutMode === "dock") {
      if (dockRect) {
        next = {
          top: dockRect.top,
          left: dockRect.left,
          width: dockRect.width,
          height: dockRect.height,
        };
      } else {
        next = {
          top: (stickyClusterRef.current?.offsetHeight ?? 96) + 4,
          right: 12,
          width: dockFallback.width,
          height: dockFallback.height,
        };
      }
    } else if (inlineRect) {
      next = {
        top: inlineRect.top,
        left: inlineRect.left,
        width: inlineRect.width,
        height: inlineRect.height,
      };
    } else {
      const anchor = playerAnchorRef.current;
      if (anchor) {
        const rect = anchor.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          next = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
        }
      }
    }

    if (next?.width && next?.height) {
      const normalized = normalizePlayerPosition(next, playerLayoutMode);
      lastKnownByModeRef.current[playerLayoutMode] = normalized;
      return normalized;
    }

    const cached = lastKnownByModeRef.current[playerLayoutMode];
    if (cached) {
      return cached;
    }

    const anchor = playerAnchorRef.current;
    if (anchor && playerLayoutMode === "inline") {
      const width = anchor.offsetWidth || dockFallback.width;
      const height = anchor.offsetHeight || (width * 9) / 16;
      const rect = anchor.getBoundingClientRect();
      return normalizePlayerPosition(
        {
          top: rect.top,
          left: rect.left,
          width,
          height,
        },
        "inline"
      );
    }

    if (playerLayoutMode === "enlarge") {
      if (isLandscapeEnlarge) {
        const viewport = window.visualViewport;
        return normalizePlayerPosition(
          {
            top: 0,
            left: 0,
            width: Math.round(viewport?.width ?? window.innerWidth),
            height: Math.round(viewport?.height ?? window.innerHeight),
          },
          "enlarge"
        );
      }
      const tickerH = stickyClusterRef.current?.offsetHeight ?? 120;
      return normalizePlayerPosition(
        {
          top: tickerH,
          left: 0,
          width: window.innerWidth,
          height: Math.max(0, window.innerHeight - tickerH),
        },
        "enlarge"
      );
    }

    return normalizePlayerPosition(
      {
        top: (stickyClusterRef.current?.offsetHeight ?? 96) + 16,
        left: 16,
        width: Math.max(0, window.innerWidth - 32),
        height: Math.max(0, ((window.innerWidth - 32) * 9) / 16),
      },
      "inline"
    );
  }, [
    dockFallback.height,
    dockFallback.width,
    dockRect,
    enlargeRect,
    inlineRect,
    isLandscapeEnlarge,
    playerLayoutMode,
  ]);

  const inlineScrubberVariant = isDocked ? null : "inline";
  const floatingScrubberVariant: "immersive" | "landscape" | null =
    showPhoneLandscapeImmersive || isDesktopEnlarge
      ? "landscape"
      : isEnlargeMode
        ? "immersive"
        : null;

  const tickerNavActions = tickerExtras.showNavActions ? (
    <>
      <Link
        href="/"
        className="text-primary shrink-0 font-semibold tracking-wide"
        onClick={e => e.stopPropagation()}
      >
        <span className="racing_sans_one">
          <span className="text-primary">tip</span>
          <span className="text-white">manna</span>
        </span>
      </Link>
      <span className="shrink-0 text-white/30">·</span>
      <button
        type="button"
        className="text-primary shrink-0 rounded-full border border-white/20 p-1 text-white"
        onClick={e => {
          e.stopPropagation();
          handleCreateYours();
        }}
      >
        Create Yours
      </button>
      <span className="shrink-0 text-white/30">·</span>
      <button
        type="button"
        aria-label="Profile"
        className="relative shrink-0 rounded-full border border-white/20 p-1"
        onClick={e => {
          e.stopPropagation();
          setIsProfileDrawerOpen(true);
        }}
      >
        <UserRound className="size-3.5" />
        <NotificationBadge
          variant="dot"
          className="-top-0.5 -right-0.5"
        />
      </button>
    </>
  ) : null;

  const playerStage = (
    <TipLinkPlayerShell
      variant={playerShellVariant}
      className={cn(
        isImmersiveRoom
          ? "h-full min-h-0 w-full flex-1 overflow-hidden"
          : cn(
              "h-full w-full overflow-hidden",
              !isPlayerFloating && "relative aspect-video w-full"
            )
      )}
    >
      {isEnlargeMode && !isDocked ? (
        <button
          type="button"
          aria-label="Close enlarged video"
          className="absolute top-2 left-2 z-[56] flex shrink-0 items-center rounded-md bg-white/40 p-1.5 text-black"
          onClick={e => {
            e.stopPropagation();
            exitImmersive();
          }}
        >
          <X className="size-4" />
        </button>
      ) : null}
      {isLandscapeEnlarge ? (
        <div
          className="pointer-events-none absolute top-[max(0.5rem,env(safe-area-inset-top,0px))] right-12 left-12 z-[57]"
          onClick={e => e.stopPropagation()}
        >
          <div className="pointer-events-auto overflow-hidden rounded-full border border-white/15 bg-black/45 backdrop-blur-md">
            <TipLinkMetricsTicker
              visits={displayMetrics.pageVisitCount}
              tips={liveNumOfTips}
              shares={displayMetrics.shares}
              sectionCtaLabel={tipPres.sectionCtaLabel}
              hideActionLabels
              onTipsClick={() => setShowTipsDrawer(true)}
              navActions={tickerNavActions}
            />
          </div>
        </div>
      ) : null}
      {!isDocked ? (
        <button
          type="button"
          aria-label="About this video"
          className="absolute top-2 right-2 z-[56] flex shrink-0 items-center gap-0.5 rounded-md bg-white/40 px-2 py-1 text-xs whitespace-nowrap text-black sm:text-sm"
          onClick={e => {
            e.stopPropagation();
            setShowDescription(true);
          }}
        >
          <Info className="size-4" />
        </button>
      ) : null}
      {isEnlargeMode && floatingScrubberVariant ? (
        <div className="pointer-events-none absolute inset-0 z-[54]">
          <div className="pointer-events-auto">
            {renderScrubber(floatingScrubberVariant, true)}
          </div>
        </div>
      ) : null}
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
      <div
        id="global-animation-layer"
        className={cn("pointer-events-none absolute inset-0", TV_RAIL_Z_INDEX)}
      />
      <div
        id="preview-animation-root"
        className="pointer-events-none absolute inset-0"
      />
      {paymentChannelId &&
      process.env.NEXT_PUBLIC_VIDEO_REQUESTS_ENABLED !== "false" ? (
        <div className="pointer-events-none absolute bottom-20 left-2 z-[62] max-w-[min(360px,calc(100%-1rem))]">
          <VideoFeatureCardBanner
            surfaceChannelId={paymentChannelId}
            hostSurfaceChannelId={paymentChannelId}
            sectionCtaLabel={tipPres.sectionCtaLabel}
            pageDrawerOpen={isTipDrawerOpen}
            onTipFeatured={() => setIsTipDrawerOpen(true)}
            onOverlayOpenChange={createFeatureCardOverlayPlaybackHandlers(
              videoRef,
              featureOverlayWasPlayingRef,
              { getWasPlaying: () => isPlaying }
            )}
            className="pointer-events-auto"
          />
        </div>
      ) : null}
      {showFlashOverlay ? (
        <VideoTipReminderOverlay
          hostFirstName={hostFirstName}
          sectionCta={tipPres.sectionCtaLabel?.trim() || "Engage"}
          onTipNow={handleTipNow}
          onDismiss={handleDismiss}
        />
      ) : null}
    </TipLinkPlayerShell>
  );

  const renderFloatingPlayer = () => (
    <div
      key="tiplink-player"
      className={cn(
        "fixed flex flex-col",
        isDocked ? "z-[115]" : isEnlargeMode ? "z-[105]" : "z-[60]"
      )}
      style={playerPositionStyle}
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="flex min-h-0 w-full flex-1 flex-col">{playerStage}</div>
      </div>
    </div>
  );

  const renderPlayerAnchor = () => (
    <div className="relative w-full">
      <div
        ref={playerAnchorRef}
        className="aspect-video w-full scroll-mt-[120px] rounded-2xl bg-black/25"
        aria-hidden={isPlayerFloating}
      />
      {!isPlayerFloating && inlineScrubberVariant
        ? renderScrubber(inlineScrubberVariant)
        : null}
    </div>
  );

  return (
    <>
      <div className="tiplink-landing-bg tiplink-galaxy-shell relative min-h-screen text-white">
        {showStickyHeader ? (
          <div
            ref={stickyClusterRef}
            className={cn(
              "sticky top-0 border-b border-white/10 bg-black/40 backdrop-blur-xl",
              isEnlargeMode ? "z-[110]" : "z-50"
            )}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <div className="flex items-center gap-3">
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
                className="flex items-baseline gap-2 font-semibold tracking-wide"
              >
                <span
                  className={cn(
                    "racing_sans_one",
                    isMobileSurface ? "text-lg" : "text-2xl"
                  )}
                >
                  <span className="text-primary">tip</span>manna
                </span>
                <span
                  className={cn(
                    "text-white/70",
                    isMobileSurface ? "text-sm" : "text-base"
                  )}
                >
                  link
                </span>
              </Link>
            </header>
            <div
              className="relative flex items-stretch"
              style={isDocked ? { minHeight: dockFallback.height } : undefined}
            >
              <div
                ref={navTickerRef}
                className="min-w-0 flex-1"
              >
                <TipLinkMetricsTicker
                  visits={displayMetrics.pageVisitCount}
                  tips={liveNumOfTips}
                  shares={displayMetrics.shares}
                  sectionCtaLabel={tipPres.sectionCtaLabel}
                  docked={isDocked}
                  dockedHeight={dockFallback.height}
                  hideActionLabels={tickerExtras.hideActionLabels}
                  useDesktopPipReserve={!isMobileSurface}
                  pipReserveMobile={PIP_RESERVE_MOBILE}
                  pipReserveDesktop={PIP_RESERVE_DESKTOP}
                  onTipsClick={() => setShowTipsDrawer(true)}
                />
              </div>
              <div
                ref={miniDockTargetRef}
                className={cn(
                  "pointer-events-none absolute top-1/2 right-3 z-10 -translate-y-1/2",
                  !isDocked && "invisible"
                )}
                style={{
                  width: dockFallback.width,
                  height: dockFallback.height,
                }}
                aria-hidden={!isDocked}
              />
              {isDocked ? (
                <button
                  type="button"
                  aria-label="Scroll to video"
                  className="absolute top-1/2 right-3 z-[120] -translate-y-1/2 cursor-pointer rounded-md bg-transparent"
                  style={{
                    width: dockFallback.width,
                    height: dockFallback.height,
                  }}
                  onClick={scrollToInlineVideo}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {showStickyHeader && preview ? (
          <div className="bg-amber-500/20 px-4 py-2 text-center text-sm text-amber-100">
            Preview mode — not indexed publicly
          </div>
        ) : null}

        {renderFloatingPlayer()}

        <main className="mx-auto flex max-w-3xl flex-col gap-6 overflow-x-hidden px-4 py-6">
          {!hideScrollContent ? (
            <section
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
              id="tip-section"
              style={{ scrollMarginTop: "120px" }}
            >
              <TipSection
                eventId={eventId}
                tippingCharacters={displayStrip as RoomCharacter[]}
                characterSets={resolvedDrawerSets}
                paymentSurface="tiplink"
                paymentChannelId={paymentChannelId}
                getPlaybackOffsetSec={getPaymentPlaybackOffsetSec}
                getWatchDurationBeforePayMs={getWatchDurationBeforePayMs}
                textTipUnitPrice={tipPres.textUnitPrice}
                sectionCtaLabel={tipPres.sectionCtaLabel}
                payLabel={tipPres.payLabel}
                tipQuoteContext={tipPres.quoteCtx}
                eliteCharacterIds={tipPres.eliteCharacterIds}
                buttonColor="white"
                shadowStyle="shadow-[0px_0px_2px_2px_#000]"
                tipLink={true}
                previewMode={preview}
                preserveStripOrder
                externalDrawer
                onRequestOpenDrawer={() => setIsTipDrawerOpen(true)}
                onRequestOpenWallet={() => setIsTipDrawerOpen(true)}
              />
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-black/25 p-1">
            {renderPlayerAnchor()}
          </section>

          {!hideScrollContent ? (
            <>
              <section className="space-y-3 text-sm text-white/80">
                <h1 className="text-2xl font-bold">
                  {countryDisplay ? (
                    <img
                      src={countryDisplay.flagUrl}
                      alt={countryDisplay.flagCode ?? "Country"}
                      width={32}
                      height={24}
                      className="float-left mt-0.5 mr-2 h-6 w-8 shrink-0 object-contain"
                    />
                  ) : null}
                  <span>{channel.title}</span>
                </h1>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-gray flex h-auto flex-col items-center justify-center gap-1 border-t-2 border-white/20 bg-black/40! py-1.5 text-sm text-white/80! shadow-[0px_2px_0px_0px_#fff]"
                    onClick={() => setShowCommentDrawer(true)}
                  >
                    <MessageCircleMore className="mr-1 size-8 text-white/80" />{" "}
                    <span className="text-[10px] text-white/80">
                      {displayMetrics.comments} Comments
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
                      {displayMetrics.saves} {saved ? "Saved" : "Save"}
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
                      {displayMetrics.shares} Share
                    </span>
                  </Button>
                </div>
              </section>

              <p className="text-xs text-white/70">
                {attributionLabel}
                {isCommunityTipLink && community?.communityType ? (
                  <span className="text-white/40">
                    {" "}
                    · {community.communityType.replace(/_/g, " ")}
                  </span>
                ) : null}
                {!isCommunityTipLink ? (
                  <span className="text-white/40"> @{host.username}</span>
                ) : null}
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
                          onClick={handleOpenTipLinkExplore}
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
                      {isCommunityTipLink ? (
                        <>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold uppercase">
                              {pitchHeadingName}&apos;s Pitch
                            </span>
                          </span>
                          <span className="flex flex-wrap items-center gap-2">
                            {community?.communityType ? (
                              <span className="text-xs text-white/70">
                                {" "}
                                {community.communityType
                                  .replace(/_/g, " ")
                                  .toLowerCase()}{" "}
                                - community
                              </span>
                            ) : null}

                            {pitchVerified ? (
                              <span
                                className="bg-moonstone-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5"
                                title="Verified creator"
                              >
                                <CircleStar className="size-3.5 text-black" />
                                <span className="text-[10px] font-medium text-black sm:text-xs">
                                  Verified
                                </span>
                              </span>
                            ) : null}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-semibold uppercase">
                            {pitchHeadingName}&apos;s Pitch
                          </span>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-white/70">
                              @{host.username}
                            </span>
                            {pitchVerified ? (
                              <span
                                className="bg-moonstone-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5"
                                title="Verified creator"
                              >
                                <CircleStar className="size-3.5 text-black" />
                                <span className="text-[10px] font-medium text-black sm:text-xs">
                                  Verified
                                </span>
                              </span>
                            ) : null}
                          </span>
                        </>
                      )}
                    </h2>

                    <a
                      href="#tip-section"
                      className="bg-primary inline-flex h-8 items-center justify-center rounded-md px-5 py-3 text-black"
                    >
                      {tipPres.sectionCtaLabel?.trim() || "Engage"}
                    </a>
                  </div>

                  <div
                    className={cn(
                      "relative w-full",
                      tipLink.bannerAspect === "square"
                        ? "aspect-square max-h-80"
                        : "aspect-video"
                    )}
                  >
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
                  </div>
                  <div className="px-4 pb-1 text-sm leading-relaxed font-medium whitespace-pre-line text-white/95">
                    {(() => {
                      const raisedLine = formatTipLinkRaisedLine({
                        moneyFor: tipLink.moneyFor,
                        amountRaised: liveAmountRaised,
                        amountToRaise: event.amountToRaise,
                        tips: liveNumOfTips,
                        showAmounts: event.showAmountRaisedOnVideos !== false,
                        onAmountClick: () => setShowTipsDrawer(true),
                      });
                      return raisedLine ? (
                        <div className="text-primary text-sm">{raisedLine}</div>
                      ) : null;
                    })()}
                  </div>
                  <p className="px-4 pb-2 text-sm leading-relaxed font-medium break-words whitespace-pre-wrap text-white/95">
                    {tipLink.pitch}
                  </p>
                </section>
              ) : null}

              <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="mb-3 text-center text-sm text-white/60">
                  {isCommunityTipLink ? "Connect with us" : "Connect with me"}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={
                      isCommunityTipLink && community
                        ? exploreCommunityJoinHref(community.id)
                        : buildCreatorProfileSharePath(host.username)
                    }
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

              {!isCommunityTipLink && payload.featuredPlaylist ? (
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
        {showStickyHeader && !isEnlargeMode ? (
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
            enabled={drawerStripeEnabled}
            tippingCharacters={drawerCatalog as RoomCharacter[]}
            textTipUnitPrice={tipPres.textUnitPrice}
          >
            <TipDrawer
              open={isTipDrawerOpen}
              onOpenChange={setIsTipDrawerOpen}
              previewMode={preview}
              stripeCheckout={drawerStripeEnabled}
              eventId={eventId}
              tippingCharacters={drawerCatalog as RoomCharacter[]}
              characterSets={resolvedDrawerSets}
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
          tippingCharacters={displayStrip as RoomCharacter[]}
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

        {showDescription ? (
          <div
            className={cn(
              "fixed inset-0 flex items-end bg-black/60 sm:items-center sm:justify-center",
              DRAWER_OVERLAY_Z_INDEX
            )}
          >
            <div
              className={cn(
                "max-h-[80vh] w-full space-y-2 overflow-y-auto rounded-t-2xl bg-zinc-900 p-6 sm:max-w-lg sm:rounded-2xl",
                DRAWER_Z_INDEX
              )}
            >
              <h2 className="text-lg font-semibold">{channel.title}</h2>
              {channel.description ? (
                <p className="text-sm whitespace-pre-wrap text-white/80">
                  {channel.description}
                </p>
              ) : null}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCommunityTipLink && community ? (
                    <>
                      <span className="text-sm">Join this community</span>
                      <button
                        type="button"
                        className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold sm:text-sm"
                        aria-label="Join this community"
                        onClick={() => setJoinCommunityOpen(true)}
                      >
                        J
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">Subscribe to this creator</span>{" "}
                      <SaveHostToggleButton
                        hostId={host.id}
                        className="rounded-md border border-white/20 px-3 py-1.5 text-xs sm:text-sm"
                        onRequireSignIn={openSaveHostSignIn}
                        signInCompletedToken={saveHostSignInToken}
                      />
                    </>
                  )}
                </div>

                <p className="text-xs text-white/40">
                  Seen: {displayMetrics.encounters}
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

        {isCommunityTipLink && community ? (
          <JoinCommunityModal
            open={joinCommunityOpen}
            onOpenChange={setJoinCommunityOpen}
            communityId={community.id}
            signInRedirectPath={exploreCommunityJoinHref(community.id)}
            title="Join this community"
          />
        ) : null}
      </div>
    </>
  );
}
