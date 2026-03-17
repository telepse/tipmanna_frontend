/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import {
  ChevronDown,
  CircleAlert,
  Maximize,
  Pause,
  Play,
  Share2,
  UserRound,
  Bookmark,
  ArrowLeftRight,
  ChevronsUp,
  CircleStop,
  FastForward,
  MoveLeft,
  BadgeCheck,
  Tv,
  Plus,
  Search,
  BellPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { VolumeX, Volume2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import Cookies from "js-cookie";

// Local imports
import VideoPlayer, { VideoPlayerRef } from "@/components/events/video-player";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { loginOrRegisterTipperAction, verifyCodeAction } from "@/actions/auth";
import { toast } from "react-toastify";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types";
import OTPInput from "react-otp-input";
import { Paragraph } from "../shared/paragraph";
import { useMediaQuery } from "react-responsive";
import { RootState } from "@/redux/store";
import { EventDialog } from "./event-dialog";
import Image from "next/image";
import { CreateDrawer } from "../tv/create-drawer";
import { ProfileDrawer } from "../tv/profile-drawer";
import { ExploreDrawer } from "../tv/explore-drawer";

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
  channels: any[];
  status: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueLocation: string;
  totalAttendees: number;
  tipperEvents: any[];
  tipperTotal: number;
  iTipped: number;
  causes: any[];
  openDrawer: boolean;
  setOpenDrawer: (v: boolean) => void;
  characterSets: any[];

  contents: any[];
  tippers: any[];
  latestContents: any[];
  mostTippedContents: any[];
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type OrientationLock =
  | "any"
  | "natural"
  | "landscape"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";

const enterLandscapeFullscreen = async (el: HTMLElement) => {
  if (!document.fullscreenElement) {
    await el.requestFullscreen();
  }

  const orientation = screen.orientation as
    | (ScreenOrientation & {
        lock?: (orientation: OrientationLock) => Promise<void>;
      })
    | undefined;

  if (orientation?.lock) {
    try {
      await orientation.lock("landscape");
    } catch {
      // iOS Safari — ignored
    }
  }
};

const exitLandscapeFullscreen = async () => {
  if (screen.orientation?.unlock) {
    screen.orientation.unlock();
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen();
  }
};

type Step = "signIn" | "verifyCode" | "tipperProfile";

export const EventLive = ({
  liveVideoLink,
  defaultAdminVideo,
  autoOpen,
  onToggleFullscreen,
  isFullscreen,
  eventName,
  organizationName,
  frameId,
  setLiveFullscreen,
  active_users,
  channels,
  eventId,
  eventSlug,
  fullName,
  username,
  status,
  eventDate,
  totalAttendees,
  startTime,
  endTime,
  venueLocation,
  tipperEvents,
  tipperTotal,
  iTipped,
  causes,
  openDrawer,
  setOpenDrawer,
  characterSets,
  contents,
  tippers,
  latestContents,
  mostTippedContents,
}: Props) => {
  const [open, setOpen] = useState(!!liveVideoLink && autoOpen);
  const videoRef = useRef<VideoPlayerRef>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [step, setStep] = useState<Step>("signIn");
  const [openSignIn, setOpenSignIn] = useState(false);

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isExploreDrawerOpen, setIsExploreDrawerOpen] = useState(false);

  const resolvedVideoUrl =
  liveVideoLink && liveVideoLink.trim() !== ""
    ? liveVideoLink
    : defaultAdminVideo;

  const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const lockLandscape = async () => {
    if (!("orientation" in screen)) return;

    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: OrientationLock) => Promise<void>;
    };

    if (orientation.lock) {
      try {
        await orientation.lock("landscape");
      } catch (err) {
        console.warn("Orientation lock failed:", err);
      }
    }
  };

  const unlockOrientation = async () => {
    if (!("orientation" in screen)) return;

    try {
      await screen.orientation.unlock();
    } catch (err) {
      console.warn("Orientation unlock failed:", err);
    }
  };

  // Check status
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);

  const [showEventDialog, setShowEventDialog] = useState(false);

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
  const [videoTitle, setVideoTitle] = useState<string>("");

  const [isPlaying, setIsPlaying] = useState(false);
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

  const [showInfo, setShowInfo] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const searchParams = useSearchParams();

  const channelId = searchParams.get("frame");

  const handleUnmute = () => {
    if (!videoRef.current) return;

    videoRef.current.unmute(); // 🔥 actually unmute player
    videoRef.current.setvolume(100); // optional but recommended

    setIsMuted(false); // 🔥 sync icon state
    setAudioUnlocked(true);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (channelId) {
      localStorage.setItem("channelId", channelId);
    }
  }, [channelId]);

  const router = useRouter();

  const isMobile = useMediaQuery({ query: "(max-width: 500px)" });
  const inputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "44px",
    height: isMobile ? "36px" : "50px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const [code, setCode] = useState("");

  const form = useForm<{
    fullName: string;
    email: string;
    acceptedTerms: false;
  }>({
    defaultValues: { fullName: "", email: "", acceptedTerms: false },
  });
  const email = form.watch("email");

  const isTipperOrHost = user?.role === "TIPPER" || user?.role === "HOST";
  const isVisitor = user?.role === "VISITOR";

  const handleClick = () => {
    if (isTipperOrHost) {
      router.push(`/tipper/${username}?from=/room/${eventId}`);
    } else if (isVisitor) {
      router.push(`/visitor/${username}?from=/room/${eventId}`);
    } else {
      setOpenSignIn(true);
    }
  };

  const openFullscreen = () => {
    if (!frameId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("frame", frameId);

    router.replace(`?${params.toString()}`, { scroll: false });
    onToggleFullscreen(true);
  };

  // -------- FIX #2: Handle auto-open via ?frame=... --------
  useEffect(() => {
    const frame = searchParams.get("frame");

    if (frame && channels.some(c => c.id === frame)) {
      setOpen(true);
      setLiveFullscreen(true);
    }
  }, [searchParams, channels, setLiveFullscreen]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentChannelIndex =
    channels.findIndex(c => c.id === channelId) !== -1
      ? channels.findIndex(c => c.id === channelId)
      : 0;

  useEffect(() => {
    if (!playerReady) return;

    const interval = setInterval(() => {
      const player = videoRef.current;

      if (!player || !player.isReady()) return;

      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
      setVideoTitle(player.getTitle());
    }, 500);

    return () => clearInterval(interval);
  }, [playerReady, currentChannelIndex]);

  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const currentChannel = channels[currentChannelIndex];

  const goToChannel = (channelId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("frame", channelId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

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

  /* -----------------------------
     Exit fullscreen on portrait
  ----------------------------- */
  useEffect(() => {
    const handler = () => {
      if (
        window.innerWidth < window.innerHeight &&
        document.fullscreenElement
      ) {
        exitLandscapeFullscreen();
        onToggleFullscreen(false);
      }
    };

    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [onToggleFullscreen]);

  const isLandscape = () =>
    typeof window !== "undefined" && window.innerWidth > window.innerHeight;

  const [landscape, setLandscape] = useState(false);

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

  const [openPlaylist, setOpenPlaylist] = useState(false);
  const [viewPlaylist, setViewPlaylist] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch();

  // Handle login
  const handleLogin = async (values: { email: string }) => {
    try {
      setIsLoading(true);

      const res = await loginOrRegisterTipperAction({
        fullName: "",
        email: values.email,
        acceptedTerms: true,
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const { id, fullName, email, username } = res.data.user;
      const token = res.data.token;

      dispatch(
        setCredentials({
          user: {
            id,
            fullName,
            email,
            username,
            role: "TIPPER",
          },
          token,
        })
      );

      // Store in cookies (for persistence)
      Cookies.set(
        "user",
        JSON.stringify({ id, fullName, email, username, role: "TIPPER" }),
        {
          expires: 7,
        }
      );
      Cookies.set("token", token, { expires: 7 });

      if (res.success) setStep("verifyCode");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to sign in tipper");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resumePlayback = () => {
    if (videoRef.current?.isReady()) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle verify
  const handleVerify = async () => {
    try {
      setIsLoading(true);

      if (!user?.email) return;

      const res = await verifyCodeAction(user.email, code);

      dispatch(
        setCredentials({
          user,
          token: token!,
          requiresVerification: false,
        })
      );

      toast.success("Email verified successfully!");

      // router.push(`/tipper/${username}?from=/room/${eventId}`);
      if (res.success) setStep("tipperProfile");
      setOpenSignIn(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to verify tipper");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setOpenPlaylist(false);
    setViewPlaylist(false); // also close fullscreen playlist dropdown
  }, [currentChannelIndex]);

  // if (!liveVideoLink) return null;

  /* -----------------------------
     Shared player UI
  ----------------------------- */
  const playerContent = (
    <div className="relative flex h-full w-full gap-4 bg-white p-4">
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
            className="absolute inset-0 left-12 z-30 flex items-center justify-center text-lg text-white"
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

        <button
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
        </button>

        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());

            if (isFullscreen) {
              // EXIT channel view
              params.delete("frame");
              router.replace(`?${params.toString()}`, { scroll: false });
              onToggleFullscreen(false);
            } else {
              // ENTER channel view
              openFullscreen();
            }
          }}
        >
          <ArrowLeftRight className="size-5" />
        </button>

        <button
          onClick={() => setOpenPlaylist(prev => !prev)}
          className="relative mt-44"
        >
          <FastForward className="fill-primary size-5 text-black" />

          {openPlaylist && (
            <div className="absolute z-50 mt-2 flex w-40 flex-col gap-1 rounded-md border shadow-md">
              {channels.map((channel, index) => {
                const isNext = index === currentChannelIndex + 1;

                return (
                  <div
                    key={channel.id}
                    className="cursor-pointer bg-black/70 px-3 py-2 text-xs text-white"
                    onClick={() => {
                      setOpenPlaylist(false);
                      requestAnimationFrame(() => {
                        goToChannel(channel.id);
                      });
                    }}
                  >
                    {isNext && <span className="font-semibold">Next: </span>}
                    {channel.title}
                  </div>
                );
              })}
            </div>
          )}
        </button>
      </div>

      {/* Video */}
      <div className="z-0 flex flex-1 items-center justify-center">
        {loadingPlayer && (
          <div className="flex h-64 w-full items-center justify-center bg-gray-200">
            <span className="animate-pulse text-gray-500">
              Loading video...
            </span>
          </div>
        )}
        {playerReady && !loadingPlayer && (
          <VideoPlayer
            ref={videoRef}
            key={currentChannel?.id || resolvedVideoUrl}
            videoUrl={currentChannel?.url || resolvedVideoUrl}
            className="h-full w-full object-cover"
          />
        )}
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
              Tip or Donate{" "}
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

  /* -----------------------------
     FULLSCREEN (PORTAL)
  ----------------------------- */
  if (isFullscreen && mounted && playerReady) {
    return createPortal(
      <div
        className={`} fixed inset-0 z-[999999] bg-black`}
        style={
          landscape
            ? undefined
            : {
                top: 0,
                bottom: "238px",
              }
        }
      >
        <div className="flex h-full w-full flex-col bg-white">
          <div className="flex items-center justify-between px-4 pt-2">
            {/* <Pin className="fill-primary size-5 rotate-45" /> */}
            <h1 className="racing_sans_one text-xs">
              <span className="text-primary">tip</span>manna
            </h1>
            <div className="text-[10px] font-medium">
              <span className="text-black">Host: {fullName.split(" ")[0]}</span>{" "}
              <span
                className="text-primary relative text-[10px] opacity-50"
                onClick={() => setViewPlaylist(prev => !prev)}
              >
                (@{username})
              </span>
              <button onClick={() => setOpenPlaylist(prev => !prev)}>
                <FastForward className="fill-primary size-5 text-black" />

                {openPlaylist && (
                  <div className="absolute z-50 mt-2 flex w-40 flex-col gap-1 rounded-md border shadow-md">
                    {channels.map((channel, index) => {
                      const isNext = index === currentChannelIndex + 1;

                      return (
                        <div
                          key={channel.id}
                          className="cursor-pointer bg-black/70 px-3 py-2 text-xs text-white"
                          onClick={() => {
                            setOpenPlaylist(false);
                            requestAnimationFrame(() => {
                              goToChannel(channel.id);
                            });
                          }}
                        >
                          {isNext && (
                            <span className="font-semibold">Next: </span>
                          )}
                          {channel.title}
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>
              {viewPlaylist && (
                <div className="absolute z-50 mt-2 flex w-40 flex-col gap-1 rounded-md border shadow-md">
                  {channels.map((channel, index) => {
                    const isNext = index === currentChannelIndex + 1;

                    return (
                      <div
                        key={channel.id}
                        className="cursor-pointer bg-black/70 px-3 py-2 text-xs text-white"
                        onClick={() => {
                          setOpenPlaylist(false);
                          requestAnimationFrame(() => {
                            goToChannel(channel.id);
                          });
                        }}
                      >
                        {isNext && (
                          <span className="font-semibold">Next: </span>
                        )}
                        {channel.title}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="bg-moonstone-blue size-[14px] rounded-full sm:size-4"></span>{" "}
              <span className="text-xs font-medium sm:text-sm">
                {active_users || 0} online
              </span>
            </div>
          </div>

          <div className="relative h-full w-full">
            {playerContent}

            <div className="absolute right-4 bottom-4 z-[1000] flex flex-col items-center gap-2">
              <span className="rounded bg-black/70 p-1 text-white">0 tips</span>

              <button
                type="button"
                onClick={() => setSaveOpen(true)}
                className="pointer-events-auto rounded bg-black/70 p-1 text-white"
              >
                <Bookmark className="size-5" />
              </button>

              <span className="rounded bg-black/70 p-1">
                <Share2 className="size-5 text-white" />
              </span>

              <div className="relative flex items-center gap-2 rounded bg-black/70 p-1">
                <CircleAlert
                  onClick={() => {
                    setShowInfo(prev => !prev);
                    setShowShare(false);
                  }}
                  className="size54 cursor-pointer text-white"
                />
                {showInfo && (
                  <div className="absolute top-1/2 left-full z-[100] mt-2 h-[50px] w-[100px] -translate-y-1/2 rounded-md border bg-white p-1 shadow-md">
                    <div className="relative">
                      <p className="text-[10px] font-semibold">{eventName}</p>
                      <p className="text-muted-foreground text-[10px]">
                        By: {organizationName}
                      </p>
                      <span
                        className="absolute -top-2 -right-1"
                        onClick={() => setShowInfo(prev => !prev)}
                      >
                        x
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          {!landscape && (
            <h4 className="px-4 text-xs">
              <span className="font-medium">Now playing:</span> {videoTitle}
            </h4>
          )}

          {/* Scrubber */}
          <div className="w-full px-4 pb-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              step={0.1}
              onChange={e => {
                const seekTo = parseFloat(e.target.value);
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

          {landscape && (
            <div className="-mt-5 grid grid-cols-3 gap-4 px-4 py-2">
              {/* Left */}
              <h4 className="text-xs font-medium">
                <span>{eventName}</span>
              </h4>

              {/* Middle */}
              <Button
                size="lg"
                onClick={() => {}}
                className="flex h-4 w-fit justify-center rounded-tl-2xl rounded-tr-2xl bg-transparent text-xs text-black"
              >
                <ChevronsUp className="text-primary" /> Tip or Donate{" "}
                <ChevronsUp className="text-primary" />
                <span
                  style={{
                    transform: "scaleX(1)",
                  }}
                  className="absolute right-18 -bottom-0.5 left-18 h-0.5 origin-left rounded-full bg-black"
                ></span>
              </Button>

              {/* Right */}
              <div className="flex items-center gap-4 self-end">
                <button type="button">
                  <Tv className={`size-7`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreateDrawerOpen(false);
                    setIsProfileDrawerOpen(false);
                    setIsExploreDrawerOpen(true);
                  }}
                >
                  <Search
                    className={`size-7 ${isExploreDrawerOpen ? "text-primary" : ""}`}
                    strokeWidth={isExploreDrawerOpen ? 3.75 : 2}
                  />
                </button>

                <button
                  type="button"
                  className="rounded-full bg-black/20 p-1"
                  onClick={() => {
                    console.log("create drawer");
                    setIsCreateDrawerOpen(true);
                  }}
                >
                  <Plus
                    className={`size-7 ${isCreateDrawerOpen ? "text-primary" : ""}`}
                    strokeWidth={isCreateDrawerOpen ? 3.75 : 2}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExploreDrawerOpen(false);
                    setIsCreateDrawerOpen(false);
                    setIsProfileDrawerOpen(true);
                  }}
                  className="absolute -top-2 -right-2"
                >
                  <UserRound
                    className={`size-7 ${isProfileDrawerOpen ? "text-primary" : ""}`}
                    strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
                  />

                  {isVisitor && (
                    <span className="absolute -top-2 -right-2 rounded-full">
                      <BellPlus className="text-destructive size-4" />
                    </span>
                  )}
                </button>
              </div>

              {/* EXPLORE SWIPER */}
              <ExploreDrawer
                isExploreDrawerOpen={isExploreDrawerOpen}
                setIsExploreDrawerOpen={setIsExploreDrawerOpen}
                contents={contents}
                latestContents={latestContents}
                mostTippedContents={mostTippedContents}
                tippers={tippers}
                setIsProfileDrawerOpen={setIsProfileDrawerOpen}
              />

              {/* CREATE DRAWER */}
              <CreateDrawer
                isCreateDrawerOpen={isCreateDrawerOpen}
                setIsCreateDrawerOpen={setIsCreateDrawerOpen}
              />

              {/* PROFILE DRAWER */}
              <ProfileDrawer
                isProfileDrawerOpen={isProfileDrawerOpen}
                setIsProfileDrawerOpen={setIsProfileDrawerOpen}
                tipperEvents={tipperEvents}
                iTipped={iTipped}
                causes={causes}
              />
            </div>
          )}

          {status === "Not started" && showEventDialog && (
            <EventDialog
              eventId={eventId}
              eventName={eventName}
              eventDate={eventDate}
              startTime={startTime}
              endTime={endTime}
              venueLocation={venueLocation}
              organizationName={organizationName}
              totalAttendees={totalAttendees}
              hostName={fullName}
            />
          )}
        </div>

        <div
          className="fixed bottom-0 w-full sm:hidden"
          style={{ zIndex: 99999999999 }}
        >
          <div className="-mt-2 flex w-full items-center justify-between gap-2 border-t border-black/20 bg-white/80 px-8 py-2">
            <button type="button">
              <Tv
              // className={`size-7 ${isTVActive ? "" : "text-primary"}`}
              // strokeWidth={isTVActive ? 2 : 3.75}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCreateDrawerOpen(false);
                setIsProfileDrawerOpen(false);
                setIsExploreDrawerOpen(true);
              }}
            >
              <Search
                className={`size-7 ${isExploreDrawerOpen ? "text-primary" : ""}`}
                strokeWidth={isExploreDrawerOpen ? 3.75 : 2}
              />
            </button>

            <button
              type="button"
              className="rounded-full bg-black/20 p-1"
              onClick={() => {
                setIsCreateDrawerOpen(true);
                setIsProfileDrawerOpen(false);
                setIsExploreDrawerOpen(false);
              }}
            >
              <Plus
                className={`size-7 ${isCreateDrawerOpen ? "text-primary" : ""}`}
                strokeWidth={isCreateDrawerOpen ? 3.75 : 2}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCreateDrawerOpen(false);
                setIsProfileDrawerOpen(true);
                setIsExploreDrawerOpen(false);
              }}
            >
              <UserRound
                className={`size-7 ${isProfileDrawerOpen ? "text-primary" : ""}`}
                strokeWidth={isProfileDrawerOpen ? 3.75 : 2}
              />
            </button>

            {/* EXPLORE SWIPER */}
            <ExploreDrawer
              isExploreDrawerOpen={isExploreDrawerOpen}
              setIsExploreDrawerOpen={setIsExploreDrawerOpen}
              contents={contents}
              latestContents={latestContents}
              mostTippedContents={mostTippedContents}
              tippers={tippers}
              setIsProfileDrawerOpen={setIsProfileDrawerOpen}
            />

            {/* CREATE DRAWER */}
            <CreateDrawer
              isCreateDrawerOpen={isCreateDrawerOpen}
              setIsCreateDrawerOpen={setIsCreateDrawerOpen}
            />

            {/* PROFILE DRAWER */}
            <ProfileDrawer
              isProfileDrawerOpen={isProfileDrawerOpen}
              setIsProfileDrawerOpen={setIsProfileDrawerOpen}
              tipperEvents={tipperEvents}
              iTipped={iTipped}
              causes={causes}
            />
          </div>
        </div>

        <Drawer
          open={profileOpen}
          onOpenChange={setProfileOpen}
        >
          <DrawerContent className="shadow-primary z-[99999999999] h-[90vh] overflow-y-auto rounded-tl-2xl rounded-tr-2xl p-4">
            {step === "signIn" && (
              <>
                <DrawerTitle className="mt-6 text-center text-xl">
                  Enter email to view profile
                </DrawerTitle>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleLogin)}
                    className="mt-6 space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter email address"
                              autoComplete="off"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="acceptedTerms"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:border-black! data-[state=checked]:bg-black!"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              I agree to the Terms and Privacy Policy
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-black"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending code..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </>
            )}

            {step === "verifyCode" && (
              <div className="relative flex flex-col items-center justify-center gap-6">
                <h2 className="mt-12 text-center text-3xl font-semibold">
                  Verify your email
                </h2>
                <Paragraph
                  align="center"
                  size="sm"
                  color="muted"
                >
                  We&apos;ve sent a 6-digit code to <strong>{email}</strong>.
                  Enter it below to verify your account.
                </Paragraph>

                <div className="react-otp-input">
                  <OTPInput
                    value={code}
                    onChange={setCode}
                    numInputs={6}
                    renderInput={props => <input {...props} />}
                    inputStyle={inputStyle}
                    shouldAutoFocus
                  />
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="w-full bg-black"
                  disabled={isLoading || code.length < 6}
                  onClick={handleVerify}
                >
                  {isLoading ? "Verifying email..." : "Verify email"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
                  onClick={() => setStep("signIn")}
                >
                  <MoveLeft /> Back
                </Button>
              </div>
            )}

            {/* {step === "tipperProfile" && (
              <>
                <TipperProfileClient
                  events={tipperEvents}
                  iTipped={tipperTotal}
                  causes={causes}
                />
              </>
            )} */}
          </DrawerContent>
        </Drawer>

        <Drawer
          open={saveOpen}
          onOpenChange={setSaveOpen}
        >
          <DrawerContent className="shadow-primary z-[99999999999] max-h-[85vh] rounded-tl-2xl rounded-tr-2xl p-6">
            {step === "signIn" ? (
              <>
                <DrawerTitle className="mt-6 text-center text-xl">
                  Enter email to save video
                </DrawerTitle>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleLogin)}
                    className="mt-6 space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter email address"
                              autoComplete="off"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="acceptedTerms"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:border-black! data-[state=checked]:bg-black!"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              I agree to the Terms and Privacy Policy
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-black"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending code..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </>
            ) : (
              <div className="relative flex flex-col items-center justify-center gap-6">
                <h2 className="mt-12 text-center text-3xl font-semibold">
                  Verify your email
                </h2>
                <Paragraph
                  align="center"
                  size="sm"
                  color="muted"
                >
                  We&apos;ve sent a 6-digit code to <strong>{email}</strong>.
                  Enter it below to verify your account.
                </Paragraph>

                <div className="react-otp-input">
                  <OTPInput
                    value={code}
                    onChange={setCode}
                    numInputs={6}
                    renderInput={props => <input {...props} />}
                    inputStyle={inputStyle}
                    shouldAutoFocus
                  />
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="w-full bg-black"
                  disabled={isLoading || code.length < 6}
                  onClick={handleVerify}
                >
                  {isLoading ? "Verifying email..." : "Verify email"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="hover:bg-gray absolute top-0 left-0 border-none outline-none hover:text-black"
                  onClick={() => setStep("signIn")}
                >
                  <MoveLeft /> Back
                </Button>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      </div>,
      document.body
    );
  }

  /* -----------------------------
     INLINE (NON-FULLSCREEN)
  ----------------------------- */
  return (
    <>
      {/* Toggle open */}
      <button
        type="button"
        className="mt-6 flex w-full cursor-pointer items-center gap-1 rounded-md text-sm select-none"
        onClick={() => setOpen(prev => !prev)}
      >
        <span
          className={`rounded-md ${
            resolvedVideoUrl ? "border border-black" : ""
          } px-2 py-0.5`}
        >
          Stream
        </span>

        <div className="flex-1 flex-col items-center -space-y-3">
          <ChevronDown className="animate-peek size-5" />
          <ChevronDown className="size-5" />
        </div>
      </button>

      {open && (
        <div className="relative z-[999999] mb-14 w-full rounded-md bg-white">
          {playerContent}

          <h4 className="px-4 text-xs">
            <span className="font-medium">Now playing:</span> {videoTitle}
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
    </>
  );
};
