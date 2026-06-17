/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { useAutoDropTip } from "@/hooks/use-auto-drop-tip";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import { usePusherTracking } from "@/hooks/use-pusher-tracking";
import type { RoomCharacter } from "@/types";
import Link from "next/link";
import Image from "next/image";

// Third-party imports
import {
  AudioLines,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  CircleStop,
  FastForward,
  Maximize2,
  MessageCircleMore,
  Pause,
  Play,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  Search,
  Share2,
  Tv,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useMediaQuery } from "react-responsive";
import { useSelector } from "react-redux";

// Local imports
import VideoPlayer, { VideoPlayerRef } from "./video-player";
import { CommunityCBadge } from "@/components/community/community-c-badge";
import { SaveHostToggleButton } from "@/components/events/save-host-toggle-button";
import { CoOwnerApprovedBadge } from "@/components/co-owner/co-owner-approved-badge";
const TipDrawer = dynamic(
  () =>
    import("./tip-drawer").then(m => ({
      default: m.TipDrawer,
    })),
  { ssr: false }
);
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { ProfileDrawer } from "../tv/profile-drawer";
import { RootState } from "@/redux/store";
import { CreateDialog } from "../home/create-dialog";

// Actions import
import {
  getSavedVideosForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getTippedEventsForTipper } from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import {
  getContentChannelAction,
  getExploreChannelMetricsAction,
} from "@/actions/contents";
import {
  formatSaveVideoError,
  isChannelSaved,
  normalizeSavedVideosList,
  toggleChannelSaveForUser,
} from "@/lib/save-video-client";
import { TipSection } from "./tip-section";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { ChannelProgressBar } from "./channel-progress-bar";
import { SaveEventId } from "./save-event-id";
import {
  buildChannelShareUrl,
  pickInitialChannelContent,
} from "@/lib/public-video-url";
import { getCurrentUser } from "./event-room-client";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  setTvAnalyticsContext,
  trackTvSaveClick,
  trackTvShareClick,
  trackTvUserInteraction,
  trackTvVideoComplete,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "@/lib/tvAnalytics";
import { toast } from "react-toastify";
import {
  FacebookIcon,
  FacebookShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "next-share";
import { ShareCopyLinkControl } from "@/components/shared/share-copy-link-control";
import { cn } from "@/lib/utils";
import { TV_RAIL_Z_INDEX } from "@/lib/drawer-z-index";
import { SURFACE_MOBILE_MAX_PX } from "@/lib/surface-breakpoints";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import { runPortraitAlignedMobileLandscapeClose } from "@/lib/mobile-landscape-close";
import { useMobileVideoViewMode } from "@/hooks/use-mobile-video-view-mode";
import {
  ImmersiveMediaTopBar,
  MobileLandscapeCloseButton,
  immersiveControlRailClassName,
  immersiveFullViewViewportClassName,
  immersiveMainRowClassName,
  immersiveMobileScrubberDockClassName,
  immersivePlayerStageClassName,
  mobileInlineActionRailBottomClass,
  mobileInlineActionRailBottomSmClass,
  mobileInlinePlayerBoundsClass,
  mobileInlineScrubberDockClass,
  mobileInlineTipSectionClass,
} from "@/components/media/immersive-media-shell";
import { CommentDrawer } from "./comment-drawer";
import { TipsDrawer } from "./tips-drawer";
import { VideoFeatureCardBanner } from "@/components/video-feature/video-feature-card-banner";
import { useFeatureCardTipContext } from "@/components/video-feature/feature-card-tip-context";
import { useTipPresentation } from "@/hooks/use-tip-presentation";
import { mergeTipPriceCatalog } from "@/lib/tip-text-selection";
import { isTipCustomizationEnabled } from "@/lib/tip-customization";

interface Props {
  contents: any[];
  characters: any[];
  eventId: string;
  characterSets: any[];
  /** Deep link from `/channel/{eventId}?channel=` — selects initial video. */
  initialChannelId?: string | null;
  /** When the active video changes (e.g. event room lightbox URL sync). */
  onActiveChannelChange?: (channelId: string) => void;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
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

export const ChannelClient = ({
  contents: initialContents,
  eventId,
  characters,
  characterSets,
  initialChannelId,
  onActiveChannelChange,
}: Props) => {
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const baseTipChars = Array.isArray(characters) ? characters : [];
  const baseTipSets = Array.isArray(characterSets) ? characterSets : [];
  const tipPres = useTipPresentation(eventId, baseTipChars as RoomCharacter[], {
    quoteLock: isTipCustomizationEnabled(),
    paymentSurface: "channel_client",
  });
  const tipStrip = tipPres.strip;
  const tipSets = baseTipSets;
  const tipPriceCatalog = useMemo(
    () =>
      mergeTipPriceCatalog(
        tipPres.catalog as RoomCharacter[],
        ...baseTipSets.map((set: { characters?: RoomCharacter[] }) =>
          Array.isArray(set.characters) ? set.characters : []
        )
      ),
    [tipPres.catalog, baseTipSets]
  );

  const videoRef = useRef<VideoPlayerRef>(null);
  const baseList = Array.isArray(initialContents) ? initialContents : [];
  const playableInitial = baseList.filter((c: any) => !c?.restricted);
  const [playlist, setPlaylist] = useState(playableInitial);
  const [currentContent, setCurrentContent] = useState(() =>
    pickInitialChannelContent(
      playableInitial,
      initialChannelId,
      playableInitial[0]
    )
  );

  const needsContentEnrichment =
    playableInitial.length === 0 ||
    !playableInitial.some((c: any) => c?.event?.id);

  useEffect(() => {
    if (!needsContentEnrichment) return;
    void getContentChannelAction(eventId).then(res => {
      if (!res.success || !Array.isArray(res.data)) return;
      const rows = res.data as any[];
      const playable = rows.filter((c: any) => !c?.restricted);
      if (
        playable.length === 0 &&
        rows.length > 0 &&
        rows.every((c: any) => c?.restricted)
      ) {
        const cid =
          rows.find((c: any) => c?.community?.id)?.community?.id ??
          rows.find((c: any) => c?.event?.communityId)?.event?.communityId;
        if (cid) {
          const here = `/channel/${eventId}`;
          router.replace(
            `/restricted/${encodeURIComponent(cid)}?next=${encodeURIComponent(here)}`
          );
          return;
        }
      }
      setPlaylist(playable);
      if (playable.length) {
        setCurrentContent((prev: any) =>
          pickInitialChannelContent(
            playable,
            initialChannelId ?? (prev?.id != null ? String(prev.id) : null),
            playable.find((p: any) => p.id === prev?.id) ?? playable[0]
          )
        );
      }
    });
  }, [eventId, router, needsContentEnrichment, initialChannelId]);

  useGlobalTipStream({ eventId, surface: "channel_client" });
  usePaymentAnimationPlayer({
    eventId,
    characters: tipStrip as RoomCharacter[],
    surface: "channel_client",
  });
  useAutoDropTip(eventId, true);

  const initialEvent = playlist[0]?.event;
  const showAmountRaisedOnVideos =
    playlist[0]?.event?.showAmountRaisedOnVideos ??
    initialEvent?.showAmountRaisedOnVideos;
  const showViewCountOnVideos =
    currentContent?.event?.showViewCountOnVideos ??
    playlist[0]?.event?.showViewCountOnVideos ??
    initialEvent?.showViewCountOnVideos;
  const showRaisedAmount = showAmountRaisedOnVideos !== false;
  const showViewCount = showViewCountOnVideos === true;

  const { amountRaised: liveAmountRaised, numOfTips: liveNumOfTips } =
    useEventRoomRealtime({
      eventId,
      initialAmountRaised: initialEvent?.amountRaised ?? 0,
      initialNumOfTips: initialEvent?.numOfTips ?? 0,
    });

  const [currentUser] = useState(() => getCurrentUser());
  const { activeUsers, trackActivity } = usePusherTracking({
    eventId,
    userInfo: currentUser ?? {
      id: "pending",
      type: "anonymous",
      username: "Anonymous User",
      isAuthenticated: false,
    },
  });

  useEffect(() => {
    trackActivity("viewing_event");
  }, [trackActivity]);

  const [isTipDrawerOpen, setIsTipDrawerOpen] = useState(false);
  const { openWalletModalNonce } = useWalletTopupTipResume(
    eventId,
    setIsTipDrawerOpen
  );

  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const [tipperEvents, setTipperEvents] = useState<any[]>([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState<any[]>([]);
  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [channelViewCount, setChannelViewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showViewCount) {
      setChannelViewCount(null);
      return;
    }
    const channelId =
      currentContent?.id != null ? String(currentContent.id) : "";
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
  }, [currentContent?.id, showViewCount]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setSavedContents([]);
        setTipperEvents([]);
        setITipped(0);
        return;
      }
      const [
        { data: _tipperEvents },
        { data: _iTipped },
        { data: _causes },
        savedRes,
      ] = await Promise.all([
        getTippedEventsForTipper(),
        getTotalAmountTippedByTipper(),
        getAllCausesAction(),
        getSavedVideosForTipper(),
      ]);

      setTipperEvents(Array.isArray(_tipperEvents) ? _tipperEvents : []);
      setITipped(coalesceNumber(_iTipped));
      setCauses(Array.isArray(_causes) ? _causes : []);
      setSavedContents(
        normalizeSavedVideosList(savedRes.success ? savedRes.data : [])
      );
    };

    void fetchData();
  }, [user?.id]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const currentContentIndex = playlist.findIndex(
    c => c.id === currentContent?.id
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const playbackSeekedForCompleteRef = useRef(false);
  const watchSegStartRef = useRef(0);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const prevPlayingForVideoStartRef = useRef(false);

  useEffect(() => {
    if (
      playlist.length &&
      (!currentContent ||
        !playlist.some((c: any) => c.id === currentContent.id))
    ) {
      setCurrentContent(playlist[0]);
    }
  }, [playlist, currentContent]);

  useEffect(() => {
    initTvAnalyticsRuntime();
  }, []);

  useEffect(() => {
    if (!eventId) return;
    void flushTvAnalytics().then(() => {
      setTvAnalyticsContext({
        eventId,
        channelId: currentContent?.id ? String(currentContent.id) : null,
        surface: "channel_client",
        communityId:
          (currentContent as { community?: { id?: string } })?.community?.id ??
          null,
      });
    });
  }, [eventId, currentContent]);

  const emitEncounterOnVideoLoaded = useCallback(() => {
    if (!eventId || !currentContent?.id) return;
    void flushTvAnalytics().then(() => {
      setTvAnalyticsContext({
        eventId,
        channelId: String(currentContent.id),
        surface: "channel_client",
        communityId:
          (currentContent as { community?: { id?: string } })?.community?.id ??
          null,
      });
    });
    trackTvVideoEncounter(`channel-client-${eventId}`, {
      channelId: String(currentContent.id),
      mode: "LOCAL",
      scheduleIndex: Math.max(0, currentContentIndex),
    });
  }, [eventId, currentContent, currentContentIndex]);

  useEffect(() => {
    if (!eventId || !currentContent?.id) return;
    if (isPlaying && !prevPlayingForVideoStartRef.current) {
      const ch = String(currentContent.id);
      trackTvVideoStart(ch, "LOCAL", Math.max(0, currentContentIndex), ch);
    }
    prevPlayingForVideoStartRef.current = isPlaying;
  }, [eventId, currentContent?.id, currentContentIndex, isPlaying]);

  useEffect(() => {
    prevPlayingForVideoStartRef.current = false;
  }, [currentContent?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      const player = videoRef.current;
      if (!player || !player.isReady()) return;

      const current = player.getCurrentTime();
      const dur = player.getDuration();

      if (dur > 0) setDuration(dur);

      if (!isSeeking) {
        setCurrentTime(current); // only update when user isn't dragging
      }
    }, 100); // 100ms gives smoother UI

    return () => clearInterval(interval);
  }, [isSeeking]);

  useEffect(() => {
    playbackSeekedForCompleteRef.current = false;
  }, [currentContent?.id]);

  useEffect(() => {
    if (!eventId || !currentContent?.id) return;
    const ch = String(currentContent.id);
    if (!isPlaying) {
      if (watchSegStartRef.current > 0) {
        const sec = (Date.now() - watchSegStartRef.current) / 1000;
        watchSegStartRef.current = 0;
        if (sec > 0.3) {
          trackTvWatchDuration(ch, Math.min(sec, 600), "LOCAL", ch);
        }
      }
      return;
    }
    if (document.visibilityState !== "visible") return;
    watchSegStartRef.current = Date.now();
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (!isPlayingRef.current) return;
      if (watchSegStartRef.current <= 0) return;
      const now = Date.now();
      const sec = (now - watchSegStartRef.current) / 1000;
      watchSegStartRef.current = now;
      if (sec > 0.3) {
        trackTvWatchDuration(ch, Math.min(sec, 300), "LOCAL", ch);
      }
    }, 15_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (watchSegStartRef.current > 0) {
          const s = (Date.now() - watchSegStartRef.current) / 1000;
          watchSegStartRef.current = 0;
          if (s > 0.3) {
            trackTvWatchDuration(ch, Math.min(s, 300), "LOCAL", ch);
          }
        }
      } else if (
        document.visibilityState === "visible" &&
        isPlayingRef.current
      ) {
        watchSegStartRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
      if (watchSegStartRef.current > 0) {
        const sec = (Date.now() - watchSegStartRef.current) / 1000;
        watchSegStartRef.current = 0;
        if (sec > 0.3) {
          trackTvWatchDuration(ch, Math.min(sec, 300), "LOCAL", ch);
        }
      }
    };
  }, [eventId, currentContent?.id, isPlaying]);

  const [isMuted, setIsMuted] = useState(false);
  const [, setAudioUnlocked] = useState(false);
  const [openPlaylist, setOpenPlaylist] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: SURFACE_MOBILE_MAX_PX });
  const {
    isFullView,
    fullPresentationFit,
    fullLayoutToggleShowsPortraitIcon,
    immersiveLayout,
    enterFull,
    exitFull,
    toggleFullVariant,
  } = useMobileVideoViewMode({
    videoUrl: currentContent?.url,
    isMobile,
  });

  useEffect(() => {
    if (!isMobile || isFullView) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMobile, isFullView]);

  const getPaymentPlaybackOffsetSec = () => {
    const t = videoRef.current?.getCurrentTime();
    return typeof t === "number" && !Number.isNaN(t) ? t : null;
  };

  const getWatchDurationBeforePayMs = () => {
    const t = videoRef.current?.getCurrentTime() ?? 0;
    return Math.max(0, Math.floor(t * 1000));
  };

  const paymentChannelIdForTip =
    playlist[currentContentIndex]?.id != null
      ? String(playlist[currentContentIndex].id)
      : null;

  const { setActiveVideoFeatureCardId } = useFeatureCardTipContext();

  useEffect(() => {
    setActiveVideoFeatureCardId(null);
  }, [paymentChannelIdForTip, setActiveVideoFeatureCardId]);

  const applyUserSeek = (seekTo: number) => {
    playbackSeekedForCompleteRef.current = true;
    trackTvUserInteraction("seek", "scrubber");
    videoRef.current?.seekTo(seekTo);
    setCurrentTime(seekTo);
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;

    if (isMuted) {
      videoRef.current.unmute();
      setIsMuted(false);
    } else {
      videoRef.current.mute();
      setIsMuted(true);
      setAudioUnlocked(true);
    }
  };

  const goToContent = (content: any) => {
    setCurrentContent(content);
    if (content?.id != null) {
      onActiveChannelChange?.(String(content.id));
    }
  };

  const playlistRef = useRef<HTMLDivElement>(null);
  const currentIndex = playlist.findIndex(c => c.id === currentContent?.id);
  const nextContent =
    currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

  const [tipPreviewOpen, setTipPreviewOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showCommentDrawer, setShowCommentDrawer] = useState(false);
  const [commentMetricsRefreshKey, setCommentMetricsRefreshKey] = useState(0);
  const [tipsListOpen, setTipsListOpen] = useState(false);

  const channelIdForShare = currentContent?.id ? String(currentContent.id) : "";

  const shareUrl =
    eventId && channelIdForShare
      ? buildChannelShareUrl({ eventId, channelId: channelIdForShare })
      : "";

  const shareTitle =
    currentContent?.title || currentContent?.event?.eventName || "Tipmanna";
  const role = user?.role;

  const saveChannelId = currentContent?.id ? String(currentContent.id) : null;
  const isCurrentChannelSaved = saveChannelId
    ? isChannelSaved(saveChannelId, savedContents)
    : false;

  const handleSaveToggle = async () => {
    if (!user?.id) {
      toast.error("Sign in to save videos");
      return;
    }
    if (!saveChannelId) {
      toast.error("No video channel selected");
      return;
    }
    const wasSaved = isChannelSaved(saveChannelId, savedContents);
    const prevList = savedContents;
    const placeholder = {
      channelId: saveChannelId,
      channel: { id: saveChannelId },
    };
    if (wasSaved) {
      setSavedContents(p =>
        p.filter(
          (s: { channelId?: string; channel?: { id?: string } }) =>
            String(s?.channelId ?? s?.channel?.id ?? "") !== saveChannelId
        )
      );
    } else {
      setSavedContents(p => [...p, placeholder]);
    }
    try {
      setIsLoading(true);
      const res = await toggleChannelSaveForUser({
        channelId: saveChannelId,
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
          trackTvSaveClick(saveChannelId);
        }
        setCommentMetricsRefreshKey(k => k + 1);
        const fresh = await getSavedVideosForTipper();
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
      setIsLoading(false);
    }
  };

  const tipDrawerStripeMounted = isTipDrawerOpen || openWalletModalNonce > 0;

  const isMobileLandscape =
    useMediaQuery({ query: "(orientation: landscape)" }) &&
    window.innerWidth <= 768;

  return (
    <div
      className={cn(
        isFullView
          ? immersiveFullViewViewportClassName("channel")
          : isMobile
            ? "fixed inset-0 h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-white px-2"
            : "relative h-[85%] w-[95%] bg-white sm:h-[80%]",

        isMobileLandscape &&
          "fixed top-0 right-0 bottom-0 left-0 h-[100%] w-[100%] bg-black p-4 text-white"
      )}
    >
      <SaveEventId
        eventId={eventId}
        canonicalEventId={currentContent?.event?.id ?? playlist[0]?.event?.id}
      />
      {isFullView && (
        <ImmersiveMediaTopBar
          onClose={exitFull}
          title={currentContent?.title}
          trailing={
            <Link
              href={`/room/${eventId}`}
              className="text-xs font-medium text-white underline underline-offset-2"
            >
              Room
            </Link>
          }
        />
      )}

      {!isMobileLandscape ? (
        <>
          {!isFullView && (
            <div
              className={cn(
                isMobile
                  ? "absolute top-[env(safe-area-inset-top,0px)] right-2 left-2 z-[95] flex items-center justify-between py-1"
                  : "fixed top-0 mx-auto flex w-[95%] items-center justify-between py-2"
              )}
            >
              <Link
                href="/partner"
                className="racing_sans_one text-sm sm:text-2xl"
              >
                <span className="text-primary">tip</span>manna
              </Link>

              <div className="flex items-center gap-2">
                <p
                  className={`border-muted-foreground rounded-md border p-1 text-[10px] sm:text-sm ${openPlaylist ? "bg-primary text-black" : "text-muted-foreground"}`}
                >
                  Host:{" "}
                  <span
                    className="cursor-pointer underline"
                    onClick={e => {
                      e.stopPropagation();
                      setOpenPlaylist(prev => !prev);
                    }}
                  >
                    {playlist[0]?.event?.hostName.split(" ")[0]}
                  </span>{" "}
                  {/* <span>@{playlist[0]?.event?.username}</span> */}
                </p>
                <SaveHostToggleButton
                  channelId={saveChannelId}
                  className="rounded bg-black/50 p-1 text-white"
                  iconClassName="size-4 text-white"
                />
                <button
                  type="button"
                  title={isMuted ? "Unmute" : "Mute"}
                  className={`cursor-pointer rounded p-1 ${isMuted ? "bg-destructive" : "bg-black/50"}`}
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="size-4 text-black" />
                  ) : (
                    <Volume2 className="size-4 text-white" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="bg-moonstone-blue size-[10px] rounded-full sm:size-4"></span>{" "}
                <span className="text-[10px] font-medium whitespace-nowrap sm:text-sm">
                  {activeUsers.length} online
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <MobileLandscapeCloseButton
          onClose={() =>
            runPortraitAlignedMobileLandscapeClose(router, {
              isFullView,
              exitFull,
            })
          }
        />
      )}

      <div
        className={cn(
          !isFullView && isMobile
            ? cn(mobileInlinePlayerBoundsClass, "flex gap-2")
            : immersiveMainRowClassName(isFullView, isMobile, immersiveLayout),
          !isFullView && !isMobile && "h-full w-full"
        )}
      >
        {/* Player controls */}
        <div
          className={cn(
            immersiveControlRailClassName(
              isFullView,
              isMobile,
              immersiveLayout
            ),
            !isFullView && isMobile && "shrink-0 gap-2 pt-2"
          )}
        >
          <button
            type="button"
            onClick={togglePlayPause}
            className="cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => videoRef.current?.stop()}
            className="cursor-pointer"
          >
            <CircleStop className="-ml-1 size-7 fill-black text-white" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="cursor-pointer"
          >
            {isMuted ? (
              <VolumeX
                className={`size-5 ${isMuted ? "text-destructive" : "text-white"}`}
              />
            ) : (
              <Volume2 className="size-5" />
            )}
          </button>

          {isMobile && (
            <span className="flex flex-col items-center gap-1">
              {!isFullView && (
                <button
                  type="button"
                  onClick={() => {
                    setIsTipDrawerOpen(false);
                    enterFull();
                  }}
                  className="cursor-pointer border border-gray-300 p-1"
                  aria-label="Full view"
                >
                  <Maximize2 className="size-5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsTipDrawerOpen(false);
                  toggleFullVariant();
                }}
                className="cursor-pointer border border-gray-300 p-1"
                aria-label={
                  fullLayoutToggleShowsPortraitIcon
                    ? "Portrait full layout"
                    : "Landscape full layout"
                }
              >
                {fullLayoutToggleShowsPortraitIcon ? (
                  <RectangleVertical className="size-5" />
                ) : (
                  <RectangleHorizontal className="size-5" />
                )}
              </button>
            </span>
          )}

          <button
            type="button"
            className="cursor-pointer"
          >
            <Link href={`/room/${eventId}`}>
              <Image
                src="/chat-room.png"
                alt="Chat Room"
                className={
                  `"-ml-1 p-0.5" h-7 w-8 shrink-0 rounded-full border` +
                  (isFullView ? " invert" : "")
                }
                width={32}
                height={32}
              />
            </Link>
          </button>
        </div>

        <div
          className={cn(
            !isFullView && isMobile
              ? "relative h-full min-h-0 flex-1 overflow-hidden"
              : immersivePlayerStageClassName(
                  isFullView,
                  isMobile,
                  immersiveLayout
                )
          )}
        >
          <div className="relative h-full w-full">
            {currentContent?.community?.id &&
            currentContent?.community?.name ? (
              <CommunityCBadge
                community={currentContent.community}
                position="top-right"
              />
            ) : null}
            {currentContent?.coOwnerApproved ? (
              <CoOwnerApprovedBadge
                stackBelowCommunity={
                  !!(
                    currentContent?.community?.id &&
                    currentContent?.community?.name
                  )
                }
              />
            ) : null}
            {paymentChannelIdForTip &&
            process.env.NEXT_PUBLIC_VIDEO_REQUESTS_ENABLED !== "false" ? (
              <div className="pointer-events-none absolute bottom-28 left-2 z-[62] max-w-[min(360px,calc(100%-1rem))]">
                <VideoFeatureCardBanner
                  surfaceChannelId={paymentChannelIdForTip}
                  hostSurfaceChannelId={paymentChannelIdForTip}
                  onTipFeatured={id => {
                    setActiveVideoFeatureCardId(id);
                    setIsTipDrawerOpen(true);
                  }}
                  className="pointer-events-auto"
                />
              </div>
            ) : null}
            <VideoPlayer
              ref={videoRef}
              videoUrl={currentContent?.url}
              key={currentContent?.id}
              className="pointer-events-none h-full w-full"
              fullPresentationFit={fullPresentationFit}
              isChannel={true}
              onPlayStateChange={setIsPlaying}
              onMuteStateChange={setIsMuted}
              onPlaybackEnded={() => {
                if (!currentContent?.id) return;
                const ch = String(currentContent.id);
                if (playbackSeekedForCompleteRef.current) return;
                trackTvVideoComplete(ch, { channelId: ch, mode: "LOCAL" });
              }}
              onVideoLoaded={emitEncounterOnVideoLoaded}
            />
            {showViewCount && channelViewCount != null && (
              <div className="pointer-events-none absolute bottom-3 left-3 z-[63] space-y-0.5 text-white drop-shadow-md">
                <p className="text-[11px] opacity-90">
                  {channelViewCount} views
                </p>
              </div>
            )}
          </div>
          <div
            id="global-animation-layer"
            className={`pointer-events-none absolute inset-0 ${TV_RAIL_Z_INDEX}`}
          />

          {/* Fast-forward icon */}
          {/* {openPlaylist &&
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setOpenPlaylist(prev => !prev);
            }}
            className={cn(
              "absolute left-1/2 z-[9999] -translate-x-1/2 cursor-pointer rounded-full border p-1 transition hover:bg-white",
              isFullView
                ? cn(
                    "-top-1 border-white/30 bg-white/20 text-white",
                    immersiveLayout === "portrait_video" &&
                      "top-2 -translate-y-0"
                  )
                : "-top-4 border-black bg-white/70"
            )}
          >
              <X className="text-primary size-4" />
          </button>} */}

          {openPlaylist && (
            <div className="absolute top-0 left-1/2 z-[9999] -translate-x-1/2">
              {/* Playlist container wrapper */}
              <div className="relative flex max-h-[300px] w-[255px] flex-col gap-2 rounded-md shadow-lg sm:max-h-[450px] sm:w-[350px]">
                <p className="absolute top-0 left-1/2 z-[9999] -translate-x-1/2 p-2 text-center text-[10px] whitespace-nowrap text-black sm:text-xs">
                  Host:{" "}
                  <span
                    className="cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      setOpenPlaylist(prev => !prev);
                    }}
                  >
                    {playlist[0]?.event?.hostName.split(" ")[0]}
                  </span>{" "}
                  <span>@{playlist[0]?.event?.username}</span>
                </p>

                <p className="absolute top-4 left-1/2 z-[9999] -translate-x-1/2 p-2 text-center text-[10px] whitespace-nowrap text-black/50 sm:text-xs">
                  Playlist: {playlist.length} videos
                </p>

                {openPlaylist && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setOpenPlaylist(prev => !prev);
                    }}
                    className={cn(
                      "absolute top-2 left-2 z-[9999] cursor-pointer rounded-full border p-1 transition hover:bg-white",
                      isFullView
                        ? cn(
                            "-top-1 border-white/30 bg-white/20 text-white",
                            immersiveLayout === "portrait_video" &&
                              "top-2 -translate-y-0"
                          )
                        : "top-2 border-black bg-white/70"
                    )}
                  >
                    <X className="text-primary size-4" />
                  </button>
                )}

                {/* Scrollable playlist */}
                <div
                  ref={playlistRef}
                  className="border-moonstone-blue relative z-[999] flex max-h-[310px] overflow-x-auto rounded-md border-2 bg-white/90 p-2 pt-8 sm:max-h-[450px]"
                  style={{ scrollbarWidth: "none" }}
                >
                  {playlist
                    // .filter(content => content.id !== currentContent?.id)
                    .map((content, index) => {
                      const isNext = content.id === nextContent?.id;
                      const scale = 0.9;

                      return (
                        <div
                          key={content.id}
                          className="relative w-[250px] shrink-0 cursor-pointer rounded-md bg-white p-4"
                          onClick={() => {
                            setOpenPlaylist(false);
                            requestAnimationFrame(() => {
                              goToContent(content);
                            });
                          }}
                          style={{
                            transform: `scale(${scale})`,
                            transition: "all 0.3s ease-in-out",
                          }}
                        >
                          <div className="relative">
                            <Image
                              src={`https://img.youtube.com/vi/${extractYoutubeID(content.url)}/hqdefault.jpg`}
                              alt="Video thumbnail"
                              width={400}
                              height={400}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/90 p-2">
                              <Play className="size-8 text-white" />
                            </div>
                          </div>

                          <div className="absolute right-4 bottom-4 flex items-center gap-1">
                            <span className="bg-primary flex size-6 shrink-0 items-center justify-center rounded-full p-2 text-xs text-white">
                              {index + 1}
                            </span>
                            /
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black p-2 text-xs text-white">
                              {playlist.length}
                            </span>
                          </div>

                          <div className="space-y-1 px-2 py-4">
                            <div className="flex items-center gap-1 text-sm text-black">
                              {isNext && (
                                <span className="flex items-center gap-1 font-semibold">
                                  <FastForward className="fill-primary size-4" />{" "}
                                  Next:
                                </span>
                              )}
                              <span>
                                {content.title.substring(0, 20)}{" "}
                                {content.title.length > 20 ? "..." : ""}
                              </span>
                            </div>

                            <p className="text-muted-foreground text-sm">
                              {formatTime(content.durationSeconds)} min
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Left arrow - fixed at bottom inside container */}
                <button
                  onClick={() =>
                    playlistRef.current?.scrollBy({
                      left: -100,
                      behavior: "smooth",
                    })
                  }
                  className="absolute top-1/2 -left-2 z-[9999] flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border border-black bg-white/90 p-0.5 shadow transition hover:bg-white"
                >
                  <ChevronLeft className="size-4 text-black" />
                </button>
                {/* Right arrow - fixed at bottom inside container */}
                <button
                  onClick={() =>
                    playlistRef.current?.scrollBy({
                      left: 100,
                      behavior: "smooth",
                    })
                  }
                  className="absolute top-1/2 -right-2 z-[9999] flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border border-black bg-white/90 p-0.5 shadow transition hover:bg-white"
                >
                  <ChevronRight className="size-4 text-black" />
                </button>
              </div>
            </div>
          )}

          <div
            className={`${isFullView ? "absolute top-1/2 right-8 z-[90] mt-2 flex -translate-y-1/2 flex-col items-center gap-2" : `absolute right-8 ${isMobile ? mobileInlineActionRailBottomClass : mobileInlineActionRailBottomSmClass} z-[90] flex flex-col items-center gap-2`}`}
          >
            <button
              type="button"
              disabled={isLoading}
              title={isCurrentChannelSaved ? "Unsave video" : "Save video"}
              onClick={e => {
                e.stopPropagation();
                if (!isLoading) void handleSaveToggle();
              }}
              className="cursor-pointer rounded bg-black/50 p-1"
            >
              {isCurrentChannelSaved ? (
                <Bookmark className="fill-moonstone-blue size-5" />
              ) : (
                <Bookmark className="size-5 text-white" />
              )}
            </button>

            {/* Share button */}
            <button
              type="button"
              className="cursor-pointer rounded bg-black/50 p-1"
              onClick={() => {
                let willOpen = false;
                setShowShare(prev => {
                  willOpen = !prev;
                  return willOpen;
                });
                if (willOpen && currentContent?.id) {
                  trackTvShareClick(String(currentContent.id));
                  setCommentMetricsRefreshKey(k => k + 1);
                }
                setShowInfo(false);
              }}
            >
              <Share2 className="size-5 text-white" />
            </button>

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
              eventId={eventId}
              channelId={paymentChannelIdForTip}
              videoTitle={
                typeof currentContent?.title === "string"
                  ? currentContent.title
                  : ""
              }
              videoDescription={
                typeof (currentContent as { description?: string } | undefined)
                  ?.description === "string"
                  ? String(
                      (currentContent as { description: string }).description
                    )
                  : ""
              }
              numOfTips={liveNumOfTips}
              amountRaised={showRaisedAmount ? Number(liveAmountRaised) : null}
              tippingCharacters={tipPriceCatalog}
              onContinueToTip={() => setIsTipDrawerOpen(true)}
              hostName={currentContent?.event?.hostName}
            />

            {showInfo && (
              <div className="absolute top-1/4 right-full z-[100] h-[50px] w-fit -translate-y-1/2 rounded-md border bg-white p-2 shadow-md">
                <div className="relative w-[150px]">
                  <p className="text-[10px] font-semibold">
                    {playlist[0]?.title}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    By: {playlist[0]?.event?.hostName}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div
            className={`${isFullView ? "absolute top-1/2 right-2 z-[90] mt-2 flex -translate-y-1/2 flex-col items-center gap-2" : `absolute right-2 ${isMobile ? mobileInlineActionRailBottomClass : mobileInlineActionRailBottomSmClass} z-[90] flex flex-col items-center gap-2`}`}
          >
            <button
              type="button"
              title="View tips"
              className="absolute -top-8 right-0 cursor-pointer rounded-md bg-black/70 p-1 text-xs font-medium whitespace-nowrap text-white sm:text-sm"
              onClick={() => setTipsListOpen(true)}
            >
              {liveNumOfTips} tips
            </button>
            {showRaisedAmount ? (
              <ChannelProgressBar
                amountToRaise={playlist[0]?.event?.amountToRaise}
                amountRaised={liveAmountRaised}
                eventId={eventId}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom section - LAPTOP */}
      {!isMobileLandscape ? (
        <div className="fixed bottom-0 mx-auto hidden w-[95%] flex-col gap-1 py-1 sm:flex sm:py-2">
          {/* Scrubber - DESKTOP */}
          <div className="absolute bottom-10 mx-auto w-full">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime || 0}
              step={0.1}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={e => {
                // Update UI immediately while dragging
                setCurrentTime(parseFloat(e.target.value));
              }}
              onMouseUp={e => {
                const seekTo = parseFloat((e.target as HTMLInputElement).value);
                applyUserSeek(seekTo);
                setIsSeeking(false);
              }}
              onTouchEnd={e => {
                const seekTo = parseFloat((e.target as HTMLInputElement).value);
                applyUserSeek(seekTo);
                setIsSeeking(false);
              }}
              className="accent-primary h-2 w-full rounded-full bg-black"
            />
            <div className="-mt-1 flex justify-between px-1 text-xs">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-1 text-xs lg:flex-row lg:gap-2">
              <div className="flex items-center gap-1">
                <AudioLines
                  className={`text-primary size-4 lg:size-6 ${isPlaying ? "wave-icon" : ""}`}
                />
                <AudioLines
                  className={`text-primary size-4 lg:size-6 ${isPlaying ? "wave-icon" : ""}`}
                />
                <span className="font-semibold">Now playing:</span>
              </div>{" "}
              {playlist[currentContentIndex]?.title.substring(0, 25)}{" "}
              {playlist[currentContentIndex]?.title.length > 25 ? "..." : ""}
            </div>

            <button
              type="button"
              onClick={() => setTipPreviewOpen(true)}
              className="relative -mt-2 flex cursor-pointer rounded-full bg-gray-200 p-1 text-sm text-black"
            >
              <ChevronsUp className="text-primary" />
              Engage <ChevronsUp className="text-primary" />{" "}
              <span className="absolute -bottom-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-500"></span>
            </button>

            {tipPreviewOpen && (
              <TippingElementsProvider
                tippingCharacters={tipStrip as RoomCharacter[]}
              >
                <div className="absolute -bottom-6 left-1/2 mx-auto h-[240px] w-[40%] -translate-x-1/2 rounded-t-xl bg-white/80 px-4 py-2 lg:w-[45%]">
                  <div className="relative">
                    <TipSection
                      eventId={eventId}
                      tippingCharacters={tipStrip as RoomCharacter[]}
                      characterSets={tipSets}
                      paymentSurface="channel_client"
                      paymentChannelId={paymentChannelIdForTip}
                      getPlaybackOffsetSec={getPaymentPlaybackOffsetSec}
                      getWatchDurationBeforePayMs={getWatchDurationBeforePayMs}
                      textTipUnitPrice={tipPres.textUnitPrice}
                      sectionCtaLabel={tipPres.sectionCtaLabel}
                      payLabel={tipPres.payLabel}
                      tipQuoteContext={tipPres.quoteCtx}
                    />

                    <button
                      type="button"
                      onClick={() => setTipPreviewOpen(false)}
                      className="absolute -top-2 -right-2 cursor-pointer rounded-full transition"
                    >
                      <X className="size-5 cursor-pointer text-black" />
                    </button>
                  </div>
                </div>
              </TippingElementsProvider>
            )}

            <div className="flex items-center gap-4">
              <Link
                href="/tv"
                className="group"
              >
                <Tv className="group-hover:text-primary group-hover:stroke-3" />
              </Link>

              <Link
                href="/explore"
                className="cursor-pointer"
                onPointerEnter={prefetchExploreFeedInitial}
                onClick={() => {
                  setIsCreatePopupOpen(false);
                  setIsProfileDrawerOpen(false);
                }}
              >
                <Search
                  className="size-5 sm:size-7"
                  strokeWidth={2}
                />
              </Link>

              <button
                type="button"
                className="cursor-pointer rounded-full bg-black/20 p-1"
                onClick={() => {
                  setIsCreatePopupOpen(true);
                  setIsProfileDrawerOpen(false);
                }}
              >
                <Plus
                  className={`size-7 ${isCreatePopupOpen ? "text-primary" : ""}`}
                  strokeWidth={isCreatePopupOpen ? 3.75 : 2}
                />
              </button>

              <button
                type="button"
                className="hidden cursor-pointer sm:inline-block"
                onClick={() => {
                  setIsCreatePopupOpen(false);
                  setIsProfileDrawerOpen(true);
                }}
              >
                <UserRound
                  className={`${isProfileDrawerOpen ? "text-primary" : ""}`}
                  strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
                />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-4 left-0 h-[25%] w-[100%] bg-black p-4">
          <div className="space-y-2">
            <span className="text-sm font-semibold">
              Now playing:{" "}
              {playlist[currentContentIndex]?.title.substring(0, 25)}{" "}
              {playlist[currentContentIndex]?.title.length > 25 ? "..." : ""}
            </span>

            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime || 0}
                  step={0.1}
                  onMouseDown={() => setIsSeeking(true)}
                  onTouchStart={() => setIsSeeking(true)}
                  onChange={e => {
                    // Update UI immediately while dragging
                    setCurrentTime(parseFloat(e.target.value));
                  }}
                  onMouseUp={e => {
                    const seekTo = parseFloat(
                      (e.target as HTMLInputElement).value
                    );
                    applyUserSeek(seekTo);
                    setIsSeeking(false);
                  }}
                  onTouchEnd={e => {
                    const seekTo = parseFloat(
                      (e.target as HTMLInputElement).value
                    );
                    applyUserSeek(seekTo);
                    setIsSeeking(false);
                  }}
                  className={cn(
                    "accent-primary h-2 w-full flex-1 rounded-full",
                    isFullView && isMobile ? "bg-white/20" : "bg-black"
                  )}
                />

                <div className="flex justify-between text-xs">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTipDrawerOpen(true)}
                className="mb-2 flex shrink-0 items-center gap-0.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-black shadow"
              >
                <ChevronsUp className="text-primary size-4" />
                Engage <ChevronsUp className="text-primary size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom section - MOBILE */}
      <div
        className={cn(
          "absolute right-2 bottom-[env(safe-area-inset-bottom,0px)] left-2 flex flex-col border-t px-4 py-1 sm:hidden",
          isFullView && isMobile && "hidden"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/tv"
            className="group"
          >
            <Tv className="group-hover:text-primary group-hover:stroke-3" />
          </Link>

          <Link
            href="/explore"
            className="cursor-pointer"
            onPointerEnter={prefetchExploreFeedInitial}
            onClick={() => {
              setIsCreatePopupOpen(false);
              setIsProfileDrawerOpen(false);
            }}
          >
            <Search
              className="size-7"
              strokeWidth={2}
            />
          </Link>

          <button
            type="button"
            className="cursor-pointer rounded-full bg-black/20 p-1"
            onClick={() => {
              setIsCreatePopupOpen(true);
              setIsProfileDrawerOpen(false);
            }}
          >
            <Plus
              className={`size-7 ${isCreatePopupOpen ? "text-primary" : ""}`}
              strokeWidth={isCreatePopupOpen ? 3.75 : 2}
            />
          </button>

          <button
            type="button"
            className="cursor-pointer"
            onClick={() => {
              setIsCreatePopupOpen(false);
              setIsProfileDrawerOpen(true);
            }}
          >
            <UserRound
              className={`size-7 ${isProfileDrawerOpen ? "text-primary" : ""}`}
              strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
            />
          </button>
        </div>
      </div>

      {/* Tip drawer section - LAPTOP */}
      {tipDrawerStripeMounted ? (
        <TippingElementsProvider
          tippingCharacters={tipStrip as RoomCharacter[]}
        >
          <TipDrawer
            open={isTipDrawerOpen}
            onOpenChange={setIsTipDrawerOpen}
            eventId={eventId}
            tippingCharacters={tipStrip as RoomCharacter[]}
            characterSets={tipSets}
            paymentSurface="channel_client"
            paymentChannelId={paymentChannelIdForTip}
            getPlaybackOffsetSec={getPaymentPlaybackOffsetSec}
            getWatchDurationBeforePayMs={getWatchDurationBeforePayMs}
            stackAboveImmersive={isFullView && isMobile}
            openWalletModalNonce={openWalletModalNonce}
            textTipUnitPrice={tipPres.textUnitPrice}
            payLabel={tipPres.payLabel}
            tipQuoteContext={tipPres.quoteCtx}
          />
        </TippingElementsProvider>
      ) : null}
      {/* Scrubber - MOBILE */}
      <div
        className={cn(
          "flex flex-col gap-2 sm:hidden",
          !isFullView && mobileInlineScrubberDockClass,
          isFullView &&
            isMobile &&
            immersiveMobileScrubberDockClassName(immersiveLayout)
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-xs",
            isFullView && isMobile && "text-white"
          )}
        >
          <span className="flex">
            <AudioLines
              className={`text-primary ${isPlaying ? "wave-icon" : ""}`}
            />
            <AudioLines
              className={`text-primary ${isPlaying ? "wave-icon" : ""}`}
            />
          </span>
          <span className="font-semibold">Now playing:</span>{" "}
          {playlist[currentContentIndex]?.title.substring(0, 25)}{" "}
          {playlist[currentContentIndex]?.title.length > 25 ? "..." : ""}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime || 0}
            step={0.1}
            onMouseDown={() => setIsSeeking(true)}
            onTouchStart={() => setIsSeeking(true)}
            onChange={e => {
              // Update UI immediately while dragging
              setCurrentTime(parseFloat(e.target.value));
            }}
            onMouseUp={e => {
              const seekTo = parseFloat((e.target as HTMLInputElement).value);
              applyUserSeek(seekTo);
              setIsSeeking(false);
            }}
            onTouchEnd={e => {
              const seekTo = parseFloat((e.target as HTMLInputElement).value);
              applyUserSeek(seekTo);
              setIsSeeking(false);
            }}
            className={cn(
              "accent-primary h-2 min-w-0 flex-1 rounded-full",
              isFullView && isMobile ? "bg-white/20" : "bg-black"
            )}
          />
          {isFullView && isMobile ? (
            <button
              type="button"
              onClick={() => setIsTipDrawerOpen(true)}
              className="mb-2 flex shrink-0 items-center gap-0.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-black shadow"
            >
              <ChevronsUp className="text-primary size-4" />
              Engage <ChevronsUp className="text-primary size-4" />
            </button>
          ) : null}
        </div>
        <div
          className={cn(
            "flex justify-between px-1 text-xs",
            isFullView && isMobile && "text-white"
          )}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Tip section - MOBILE */}
      <TippingElementsProvider tippingCharacters={tipStrip as RoomCharacter[]}>
        <div
          className={cn(
            "absolute sm:hidden",
            isFullView && isMobile
              ? cn(
                  "hidden max-h-[min(38vh,280px)] overflow-y-auto rounded-t-xl border border-white/15 bg-zinc-900/95 px-2 py-2",
                  "right-2 bottom-[5.25rem] left-2",
                  immersiveLayout === "landscape_video" && "left-12"
                )
              : mobileInlineTipSectionClass
          )}
        >
          <TipSection
            eventId={eventId}
            tippingCharacters={tipStrip as RoomCharacter[]}
            characterSets={tipSets}
            paymentSurface="channel_client"
            paymentChannelId={paymentChannelIdForTip}
            getPlaybackOffsetSec={getPaymentPlaybackOffsetSec}
            getWatchDurationBeforePayMs={getWatchDurationBeforePayMs}
            stackDrawerAboveImmersive={isFullView && isMobile}
            textTipUnitPrice={tipPres.textUnitPrice}
            sectionCtaLabel={tipPres.sectionCtaLabel}
            payLabel={tipPres.payLabel}
            tipQuoteContext={tipPres.quoteCtx}
          />
        </div>
      </TippingElementsProvider>

      {/* Create popup section */}
      <CreateDialog
        openPopup={isCreatePopupOpen}
        setOpenPopup={setIsCreatePopupOpen}
      />

      <TipsDrawer
        open={tipsListOpen}
        onOpenChange={setTipsListOpen}
        eventId={eventId}
        channelId={currentContent?.id ? String(currentContent.id) : null}
        eventRoomTipCount={liveNumOfTips}
        videoTipCount={
          typeof currentContent?.numOfTips === "number"
            ? currentContent.numOfTips
            : liveNumOfTips
        }
      />

      {/* PROFILE DRAWER */}
      <ProfileDrawer
        isProfileDrawerOpen={isProfileDrawerOpen}
        setIsProfileDrawerOpen={setIsProfileDrawerOpen}
        tipperEvents={tipperEvents}
        iTipped={iTipped}
        causes={causes}
        savedContents={savedContents || []}
      />
    </div>
  );
};
