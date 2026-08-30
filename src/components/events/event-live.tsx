/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import {
  ChevronDown,
  Maximize,
  Pause,
  Play,
  CircleStop,
  BadgeCheck,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VolumeX, Volume2 } from "lucide-react";

// Local imports
import {
  initTvAnalyticsRuntime,
  flushTvAnalytics,
  setTvAnalyticsContext,
  trackTvUserInteraction,
  trackTvVideoComplete,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "@/lib/tvAnalytics";
import VideoPlayer, { VideoPlayerRef } from "@/components/events/video-player";
import {
  VideoSurfaceBadges,
  pickVideoSurfaceBadgeProps,
} from "@/components/video/video-surface-badges";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";
import Image from "next/image";
import { EventProgressBar } from "./event-progress-bar";
import { ChannelProgressBar } from "./channel-progress-bar";
const ChannelClient = dynamic(
  () =>
    import("./channel-client").then(m => ({
      default: m.ChannelClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[50vh] w-full max-w-4xl animate-pulse items-center justify-center rounded-md bg-gray-100 text-sm text-gray-500">
        Loading player…
      </div>
    ),
  }
);
import { TipsDrawer } from "./tips-drawer";
import {
  AUTH_MODAL_Z_INDEX,
  OVERLAY_Z_INDEX,
  TV_RAIL_Z_INDEX,
} from "@/lib/drawer-z-index";
import {
  buildChannelSharePath,
  buildRoomSharePath,
} from "@/lib/public-video-url";
import { SelectDefaultVideoModal } from "./select-default-video-modal";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useDefaultChannelRealtime } from "@/hooks/use-default-channel-realtime";
import { toast } from "react-toastify";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

interface Props {
  liveVideoLink: string;
  defaultAdminVideo: string;
  isFullscreen: boolean;
  autoOpen?: boolean;
  numOfTips: number;
  eventId: string;
  eventName: string;
  amountToRaise: number;
  amountRaised: number;
  eventCode: string;
  eventSlug: string;
  fullName: string;
  username: string;
  backgroundUrl: string;
  hideProgressBarAmount: boolean;
  showLatestAmount: boolean;
  latestTipAmount: number;
  tippingCharacters: any[];
  tipUsageDisclosure: any[];
  organizationName: string;
  frameId: string;
  setLiveFullscreen: (v: boolean) => void;
  onToggleFullscreen: (v: boolean) => void;
  active_users: number;
  status: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueLocation: string;
  totalAttendees: number;
  iTipped: number;
  openDrawer: boolean;
  setOpenDrawer: (v: boolean) => void;
  characterSets: any[];
  channels: any[];
  isEventOwner: string;
  onChannelCreated?: (channel: EventRoomVideoChannel) => void;

  // contents: any[];
  // tippers: any[];
  // latestContents: any[];
  // mostTippedContents: any[];
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const EventLive = ({
  liveVideoLink,
  defaultAdminVideo,
  autoOpen,
  isFullscreen,
  channels,
  eventId,
  fullName,
  status,
  setOpenDrawer,
  characterSets,
  tippingCharacters,
  amountToRaise,
  amountRaised,
  numOfTips,
  frameId,
  isEventOwner,
  onChannelCreated,
}: Props) => {
  const router = useRouter();
  const roomPathRef = useRef<string | null>(null);
  const [open, setOpen] = useState(!!liveVideoLink && autoOpen);
  const videoRef = useRef<VideoPlayerRef>(null);
  const channelList = Array.isArray(channels) ? channels : [];

  const [showProgress] = useState(false);

  const [selectDefaultVideoModalOpen, setSelectDefaultVideoModalOpen] =
    useState(false);

  const { user, tag } = useSelector((state: RootState) => state.auth);

  const eventOwner = isEventOwner === user?.id || tag === "COHOST";

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [tipsListOpen, setTipsListOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const searchParams = useSearchParams();

  const frameParam = searchParams.get("frame");
  const resolvedChannelId =
    (typeof frameParam === "string" && frameParam.trim()) ||
    (typeof frameId === "string" && frameId.trim()) ||
    null;

  useDefaultChannelRealtime(eventId, payload => {
    if (frameParam?.trim()) return;
    toast.info(`Host switched streaming to "${payload.title}"`);
    const roomPath = buildRoomSharePath(eventId);
    router.replace(roomPath, { scroll: false });
  });

  const currentChannel =
    (resolvedChannelId
      ? channelList?.find(c => String(c.id) === resolvedChannelId)
      : undefined) ??
    channelList?.find(c => c.isDefault) ??
    channelList?.[0];

  const syncLightboxUrl = useCallback(
    (channelId: string | null | undefined, mode: "push" | "replace") => {
      if (typeof window === "undefined" || !eventId?.trim()) return;
      const path = buildChannelSharePath({
        eventId,
        channelId: channelId?.trim() || null,
      });
      const state = { eventRoomChannelLightbox: true };
      if (mode === "push") {
        window.history.pushState(state, "", path);
      } else {
        window.history.replaceState(state, "", path);
      }
    },
    [eventId]
  );

  const closeLightbox = useCallback(
    (restoreRoomUrl = true) => {
      setIsLightboxOpen(false);
      if (!restoreRoomUrl) return;
      const roomPath = roomPathRef.current ?? buildRoomSharePath(eventId);
      router.replace(roomPath, { scroll: false });
    },
    [eventId, router]
  );

  const openLightbox = useCallback(() => {
    roomPathRef.current = buildRoomSharePath(eventId);
    syncLightboxUrl(
      currentChannel?.id ? String(currentChannel.id) : null,
      "push"
    );
    setIsLightboxOpen(true);
  }, [eventId, currentChannel?.id, syncLightboxUrl]);

  const resolvedVideoUrl =
    liveVideoLink && liveVideoLink.trim() !== ""
      ? liveVideoLink
      : defaultAdminVideo;

  const [, setShowEventDialog] = useState(false);

  useEffect(() => {
    if (status !== "Not started") return;

    const key = `eventDialogSeen_${eventId}`;
    const hasSeen = localStorage.getItem(key);

    if (!hasSeen) {
      setShowEventDialog(true);
      localStorage.setItem(key, "true");
    }
  }, [status, eventId]);

  // -------- FIX #1: Delay player mount until container is ready --------
  const [playerReady, setPlayerReady] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const prevPlayingForAnalyticsRef = useRef(false);
  const playbackSeekedForCompleteRef = useRef(false);
  const watchSegStartRef = useRef(0);
  const encounterSentForStreamActivationRef = useRef(false);
  const [isMuted, setIsMuted] = useState(true);

  const [shownReminders, setShownReminders] = useState<Set<number>>(new Set());
  const [activeReminder, setActiveReminder] = useState<number | null>(null);

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

  const currentChannelIndex = currentChannel
    ? Math.max(0, channelList.findIndex(c => c.id === currentChannel.id) ?? 0)
    : 0;

  const handleUnmute = () => {
    if (!videoRef.current) return;

    videoRef.current.unmute(); // 🔥 actually unmute player
    videoRef.current.setvolume(100); // optional but recommended

    setIsMuted(false); // 🔥 sync icon state
    setAudioUnlocked(true);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (resolvedChannelId) {
      localStorage.setItem("channelId", resolvedChannelId);
    }
  }, [resolvedChannelId]);

  const [, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onPopState = () => closeLightbox(false);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isLightboxOpen, closeLightbox]);

  const displayVideoTitle =
    typeof currentChannel?.title === "string"
      ? currentChannel.title.trim()
      : "";

  useEffect(() => {
    if (!playerReady) return;

    const interval = setInterval(() => {
      const player = videoRef.current;

      if (!player || !player.isReady()) return;

      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
    }, 500);

    return () => clearInterval(interval);
  }, [playerReady, currentChannelIndex]);

  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useYoutubeVideoAspect(currentChannel?.url || resolvedVideoUrl);

  useEffect(() => {
    initTvAnalyticsRuntime();
  }, []);

  useEffect(() => {
    if (!eventId || !channels?.length) return;
    void flushTvAnalytics().then(() => {
      setTvAnalyticsContext({
        eventId,
        channelId: currentChannel?.id ?? null,
        surface: "event_room",
      });
    });
  }, [eventId, currentChannel?.id, channels?.length]);

  /**
   * Video encounter when the Stream control opens the live player (or fullscreen player is active).
   * Resets when the stream section is collapsed so reopening counts again.
   */
  useEffect(() => {
    const liveActive = open || isFullscreen;
    if (!liveActive) {
      encounterSentForStreamActivationRef.current = false;
      return;
    }
    if (!eventId || !channels?.length) return;
    const ch = channels[currentChannelIndex];
    if (!ch?.id) return;
    if (encounterSentForStreamActivationRef.current) return;
    encounterSentForStreamActivationRef.current = true;
    void flushTvAnalytics().then(() => {
      setTvAnalyticsContext({
        eventId,
        channelId: ch.id,
        surface: "event_room",
      });
    });
    trackTvVideoEncounter(`event-room-${eventId}`, {
      channelId: ch.id,
      mode: "LOCAL",
      scheduleIndex: currentChannelIndex,
    });
  }, [open, isFullscreen, eventId, channels, currentChannelIndex]);

  /** Playback starts → video view (`video_start`). */
  useEffect(() => {
    if (!eventId || !currentChannel?.id || !playerReady) return;
    if (isPlaying && !prevPlayingForAnalyticsRef.current) {
      trackTvVideoStart(
        `room-${currentChannel.id}`,
        "LOCAL",
        currentChannelIndex,
        currentChannel.id
      );
    }
    prevPlayingForAnalyticsRef.current = isPlaying;
  }, [
    eventId,
    currentChannel?.id,
    currentChannelIndex,
    isPlaying,
    playerReady,
  ]);

  useEffect(() => {
    playbackSeekedForCompleteRef.current = false;
    prevPlayingForAnalyticsRef.current = false;
  }, [currentChannel?.id]);

  useEffect(() => {
    if (!eventId || !currentChannel?.id || !playerReady) return;
    const itemId = `room-${currentChannel.id}`;
    const chId = currentChannel.id;
    if (!isPlaying) {
      if (watchSegStartRef.current > 0) {
        const sec = (Date.now() - watchSegStartRef.current) / 1000;
        watchSegStartRef.current = 0;
        if (sec > 0.3) {
          trackTvWatchDuration(itemId, Math.min(sec, 600), "LOCAL", chId);
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
        trackTvWatchDuration(itemId, Math.min(sec, 300), "LOCAL", chId);
      }
    }, 15_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (watchSegStartRef.current > 0) {
          const s = (Date.now() - watchSegStartRef.current) / 1000;
          watchSegStartRef.current = 0;
          if (s > 0.3) {
            trackTvWatchDuration(itemId, Math.min(s, 300), "LOCAL", chId);
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
          trackTvWatchDuration(itemId, Math.min(sec, 300), "LOCAL", chId);
        }
      }
    };
  }, [eventId, currentChannel?.id, playerReady, isPlaying]);

  // const goToChannel = (channelId: string) => {
  //   const params = new URLSearchParams(searchParams.toString());
  //   params.set("frame", channelId);
  //   router.replace(`?${params.toString()}`, { scroll: false });
  // };

  useEffect(() => {
    setIsPlaying(true);
  }, [currentChannelIndex]);

  useEffect(() => {
    setIsMuted(true);
  }, [currentChannelIndex]);

  // -------- FIX #3: Mount player after small delay for proper layout --------
  // Update playerReady effect to include loading state
  useEffect(() => {
    if (open || isFullscreen) {
      setLoadingPlayer(true);

      const t = setTimeout(() => {
        setPlayerReady(true);
        // setForceReload(prev => !prev); // force fresh mount
        setLoadingPlayer(false); // cdone loading
      }, 100); // small delay ensures container has layout

      return () => clearTimeout(t);
    } else {
      setPlayerReady(false);
      setLoadingPlayer(true);
    }
  }, [open, isFullscreen]);

  const isLandscape = () =>
    typeof window !== "undefined" && window.innerWidth > window.innerHeight;

  const [, setLandscape] = useState(false);

  useEffect(() => {
    const update = () => setLandscape(isLandscape());
    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    setShownReminders(new Set());
    setActiveReminder(null);
  }, [currentChannelIndex]);

  useEffect(() => {
    if (!currentChannel?.reminders?.length) return;

    const remindersInSeconds = currentChannel.reminders.map(
      (min: number) => min * 60
    );

    for (let i = 0; i < remindersInSeconds.length; i++) {
      const reminderTime = remindersInSeconds[i];
      const minuteValue = currentChannel.reminders[i];

      if (currentTime >= reminderTime && !shownReminders.has(reminderTime)) {
        // Mark as shown
        setShownReminders(prev => {
          const updated = new Set(prev);
          updated.add(reminderTime);
          return updated;
        });

        // Pause player
        if (videoRef.current?.isReady()) {
          videoRef.current.pause();
          setIsPlaying(false);
        }

        // Show popup
        setActiveReminder(minuteValue);

        break; // 🚀 VERY IMPORTANT — stop after first match
      }
    }
  }, [currentTime, currentChannel, shownReminders]);

  const [, setOpenPlaylist] = useState(false);
  const [, setViewPlaylist] = useState(false);

  const resumePlayback = () => {
    if (videoRef.current?.isReady()) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const [centerIndex] = useState(currentChannelIndex);

  const itemsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const container = itemsRef.current;
    const el = itemsRef.current[centerIndex];

    if (!container || !el) return;

    const containerHeight = container[0]?.clientHeight / 2;
    const elCenter = el?.offsetTop + el?.clientHeight / 2;

    if (elCenter > containerHeight) {
      container[0]?.scrollTo({
        top: elCenter - containerHeight,
        behavior: "smooth",
      });
    }
  }, [centerIndex]);

  useEffect(() => {
    setOpenPlaylist(false);
    setViewPlaylist(false); // also close fullscreen playlist dropdown
  }, [currentChannelIndex]);

  // if (!liveVideoLink) return null;

  /* -----------------------------
     Shared player UI
  ----------------------------- */
  const playerContent = (
    <div className="relative z-[1000] flex h-[200px] w-full gap-4 p-4">
      {/* Controls */}
      <div className="flex flex-col gap-2">
        <button onClick={togglePlayPause}>
          {isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5" />
          )}
        </button>

        <button onClick={() => videoRef.current?.stop()}>
          <CircleStop className="-ml-1 size-7 fill-black text-white" />
        </button>

        <button onClick={toggleMute}>
          {isMuted ? (
            <VolumeX className="size-5" />
          ) : (
            <Volume2 className="size-5" />
          )}
        </button>

        {!audioUnlocked && !loadingPlayer && (
          <button
            onClick={handleUnmute}
            className="pointer-events-none absolute inset-0 left-12 z-30 flex items-center justify-center text-lg text-white"
          ></button>
        )}

        {!audioUnlocked && !loadingPlayer && (
          <button
            onClick={handleUnmute}
            className="absolute bottom-6 left-14 z-30 flex items-center gap-1 text-xs text-white"
          >
            {isMuted ? (
              <>
                <VolumeX className="size-5" /> Tap to unmute
              </>
            ) : (
              <Volume2 className="size-5" />
            )}
          </button>
        )}

        {showProgress && (
          <div
            onClick={e => e.stopPropagation()}
            className="animate-in fade-in slide-in-from-bottom-4 absolute bottom-20 left-1/2 z-[1200] w-[85%] -translate-x-1/2 duration-300"
          >
            <div className="rounded-xl bg-black/70 p-3 backdrop-blur-md">
              <EventProgressBar
                amountToRaise={amountToRaise}
                amountRaised={amountRaised}
                eventId={eventId}
              />
            </div>
          </div>
        )}

        {/* <button
          onClick={async () => {
            if (!fullscreenRef.current) return;

            // ❌ Block fullscreen in portrait
            if (!isLandscape()) return;

            if (document.fullscreenElement) {
              await exitLandscapeFullscreen();
              onToggleFullscreen(false);
            } else {
              await enterLandscapeFullscreen(fullscreenRef.current);
              onToggleFullscreen(true);
            }
          }}
        >
          <Maximize className="size-5" />
        </button> */}

        {/* <button
          onClick={async () => {
            if (!fullscreenRef.current) return;

            const isFs = !!document.fullscreenElement;

            if (isFs) {
              await document.exitFullscreen();
              if (isPhone()) {
                await unlockOrientation();
              }
              onToggleFullscreen(false);
            } else {
              if (isPhone()) {
                await lockLandscape();
              }

              await fullscreenRef.current.requestFullscreen();
              onToggleFullscreen(true);
            }
          }}
        >
          <Maximize className="size-5" />
        </button> */}

        <button
          type="button"
          onClick={openLightbox}
        >
          <Maximize className="size-5" />
        </button>
      </div>

      {/* Video */}
      <div className="pointer-events-none relative z-0 flex flex-1 items-center justify-center">
        {loadingPlayer && (
          <div className="flex h-64 w-full items-center justify-center bg-gray-200">
            <span className="animate-pulse text-gray-500">
              Loading video...
            </span>
          </div>
        )}
        {playerReady && !loadingPlayer && (
          <div className="relative h-full w-full">
            <VideoPlayer
              ref={videoRef}
              key={currentChannel?.id || resolvedVideoUrl}
              videoUrl={currentChannel?.url || resolvedVideoUrl}
              className="h-full w-full object-cover"
              onPlayStateChange={setIsPlaying}
              onMuteStateChange={setIsMuted}
              onPlaybackEnded={() => {
                if (!currentChannel?.id) return;
                if (playbackSeekedForCompleteRef.current) return;
                const id = currentChannel.id;
                trackTvVideoComplete(`room-${id}`, {
                  channelId: id,
                  mode: "LOCAL",
                });
              }}
            />
            <VideoSurfaceBadges
              {...pickVideoSurfaceBadgeProps(currentChannel, eventId)}
              position="top-right"
            />
          </div>
        )}

        <div
          id="global-animation-layer"
          className={`pointer-events-none absolute inset-0 ${TV_RAIL_Z_INDEX}`}
        />
      </div>

      {activeReminder !== null && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="w-[300px] space-y-4 rounded-xl bg-white p-6 text-center shadow-xl">
            <h3 className="mb-2 flex items-center justify-center gap-1 text-base font-semibold">
              Reminder from host{" "}
            </h3>
            <p className="-mt-2 text-center">
              <span className="text-muted-foreground flex items-center justify-center gap-1 text-xs">
                {fullName}{" "}
                <BadgeCheck className="fill-primary size-5 text-black" />
              </span>
            </p>
            <Button
              variant="default"
              className="mb-4 flex w-full items-center justify-center gap-1 rounded-2xl bg-gray-200 text-sm text-black"
              onClick={() => {
                setOpenDrawer(true);
                setActiveReminder(null);
              }}
            >
              <Image
                src="/icons/love.png"
                alt="Love"
                width={10}
                height={10}
                className="size-5"
              />
              <Image
                src="/icons/star.png"
                alt="Star"
                width={10}
                height={10}
                className="size-5"
              />{" "}
              Engage{" "}
              <div className="flex items-center gap-1">
                <Image
                  src="/icons/burger.png"
                  alt="Burger"
                  width={10}
                  height={10}
                  className="size-5"
                />
                <Image
                  src="/icons/chicken.png"
                  alt="Chicken"
                  width={10}
                  height={10}
                  className="size-5"
                />
              </div>
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                variant="default"
                className="w-full rounded-2xl bg-gray-200 text-black outline-none"
                onClick={() => {
                  setActiveReminder(null);
                  resumePlayback();
                }}
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isLightboxOpen) {
    return (
      <div
        className={`${OVERLAY_Z_INDEX} fixed inset-0 flex h-screen w-screen items-center justify-center bg-white`}
      >
        <button
          type="button"
          className={`absolute top-10 right-4 inline-block rounded-md bg-black p-1 text-xs text-white underline lg:hidden ${AUTH_MODAL_Z_INDEX} cursor-pointer`}
          onClick={() => closeLightbox()}
        >
          Back to event room
        </button>
        <ChannelClient
          contents={channels as any[]}
          characters={tippingCharacters as any[]}
          characterSets={characterSets}
          eventId={eventId}
          initialChannelId={
            currentChannel?.id ? String(currentChannel.id) : null
          }
          onActiveChannelChange={channelId => {
            if (isLightboxOpen) {
              syncLightboxUrl(channelId, "replace");
            }
          }}
          openedFromEventRoom={true}
        />
        <button
          type="button"
          className={`absolute top-3 right-32 hidden text-sm underline lg:inline-block ${AUTH_MODAL_Z_INDEX} cursor-pointer`}
          onClick={() => closeLightbox()}
        >
          Back to event room
        </button>
      </div>
    );
  }

  const seedModalDraftId = searchParams.get("modalDraftId");

  /* -----------------------------
     INLINE (NON-FULLSCREEN)
  ----------------------------- */
  return (
    <>
      {/* Toggle open */}
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          className="flex w-fit cursor-pointer items-center gap-1 rounded-md text-sm select-none"
        >
          <div
            className="flex items-center gap-1"
            onClick={() => setOpen(prev => !prev)}
          >
            <span
              className={`rounded-md ${open ? "bg-secondary" : ""} ${
                resolvedVideoUrl ? "border border-black" : ""
              } px-2 py-0.5`}
            >
              Stream
            </span>

            <div className="flex-1 flex-col items-center -space-y-3">
              <ChevronDown className="animate-peek size-5" />
              <ChevronDown className="size-5" />
            </div>
          </div>
        </button>

        {open && eventOwner && (
          <span
            className="cursor-pointer text-[8px] underline sm:text-[10px]"
            onClick={() => setSelectDefaultVideoModalOpen(prev => !prev)}
          >
            Change streaming video
          </span>
        )}
      </div>

      <SelectDefaultVideoModal
        open={selectDefaultVideoModalOpen}
        onClose={() => setSelectDefaultVideoModalOpen(false)}
        channels={channelList}
        isHost={eventOwner}
        eventId={eventId}
        frameId={frameId}
        liveVideoLink={liveVideoLink}
        eventEventType={""}
        seedDraftId={seedModalDraftId}
        onChannelCreated={onChannelCreated}
      />

      {open && (
        <div className="relative z-[1000] mb-14 w-full rounded-md bg-white">
          {playerContent}

          <h4 className="mr-4 px-4 text-xs">
            <span className="font-medium">Now playing:</span>{" "}
            {displayVideoTitle.substring(0, 20)}
            {displayVideoTitle.length > 20 ? "..." : ""}
          </h4>

          <div className="w-full px-4 pb-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              step={0.1}
              onChange={e => {
                const seekTo = parseFloat(e.target.value);
                playbackSeekedForCompleteRef.current = true;
                trackTvUserInteraction("seek", "scrubber");
                videoRef.current?.seekTo(seekTo);
                setCurrentTime(seekTo);
              }}
              className="accent-primary h-2 w-full rounded-full bg-black"
            />
            <div className="-mt-1 flex justify-between px-1 text-xs">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}

      <TipsDrawer
        open={tipsListOpen}
        onOpenChange={setTipsListOpen}
        eventId={eventId}
        channelId={currentChannel?.id ? String(currentChannel.id) : null}
        eventRoomTipCount={numOfTips}
        videoTipCount={numOfTips}
      />
    </>
  );
};
