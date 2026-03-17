"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Third-party imports
import {
  Volume2,
  VolumeX,
  CircleStop,
  Play,
  Pause,
  X,
  LoaderCircle,
  Maximize,
  Minimize,
} from "lucide-react";

// Local imports
import TvPlayer, { TvPlayerRef } from "./tv-player";
import { resolveBroadcastPosition } from "@/lib/broadcast-resolver";
import { extractYoutubeID } from "@/lib/extractYoutubeID";

type Props = {
  broadcastEpoch: number;
  totalDuration: number;
  items: {
    channel: {
      url: string;
      title: string;
    };
  }[];
  playerRef: React.RefObject<TvPlayerRef | null>;
  currentIndex?: number;
  mode: "GLOBAL" | "LOCAL";
};

export const TvLooper = ({
  broadcastEpoch,
  totalDuration,
  items,
  playerRef,
  currentIndex,
  mode,
}: Props) => {
  const raf = useRef<number>(0);
  const currentIndexRef = useRef(-1);

  const [playerReady, setPlayerReady] = useState(false);
  const [isLive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [miniPlayerActive, setMiniPlayerActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTitle, setCurrentTitle] = useState(
    items[currentIndex ?? 0]?.channel.title || ""
  );
  const [isLoading, setIsLoading] = useState(true);

  const desiredMuteRef = useRef(isMuted);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const router = useRouter();

  const handleMaximize = () => {
    const currentItem =
      items[currentIndexRef.current] || items[currentIndex ?? 0];

    if (!currentItem) return;

    const videoId = extractYoutubeID(currentItem.channel.url);

    router.push(`/tv?videoId=${videoId}`);
  };

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    desiredMuteRef.current = isMuted;
  }, [isMuted]);

  // ---- Broadcast loop -----
  const loop = useCallback(() => {
    if (!playerRef.current || !isLive) return;

    let resolved;

    if (mode === "GLOBAL") {
      // LIVE: calculate index & offset based on broadcastEpoch
      resolved = resolveBroadcastPosition(broadcastEpoch, totalDuration, items);
    } else {
      // LOCAL: just play the selected video from currentIndex
      const index = currentIndex ?? 0;
      resolved = { index, offset: 0 };
    }

    const { index, offset } = resolved;

    if (index !== currentIndexRef.current) {
      const item = items[index];

      // Show loading overlay
      setIsLoading(true);

      // Load the new video
      playerRef.current.load(extractYoutubeID(item.channel.url), offset);

      // Auto-play the video
      playerRef.current.play();

      // Update the displayed title
      setCurrentTitle(item.channel.title || "");

      // Apply the desired mute state AFTER the video is ready
      setTimeout(() => {
        if (!playerRef.current) return;
        if (desiredMuteRef.current) {
          playerRef.current.mute();
        } else {
          playerRef.current.unmute();
        }
      }, 500); // small delay ensures YouTube player is ready

      // Preload next thumbnail
      const nextIndex = (index + 1) % items.length;
      const nextVideo = extractYoutubeID(items[nextIndex].channel.url);
      new Image().src = `https://img.youtube.com/vi/${nextVideo}/hqdefault.jpg`;

      currentIndexRef.current = index;
    }

    raf.current = requestAnimationFrame(loop);
  }, [
    broadcastEpoch,
    isLive,
    items,
    playerRef,
    totalDuration,
    currentIndex,
    mode,
  ]);

  // inside TvLooper
  useEffect(() => {
    if (mode !== "GLOBAL") return; // only for LIVE

    const interval = setInterval(() => {
      if (!playerRef.current) return;

      const current = playerRef.current.getCurrentTime();
      const total = playerRef.current.getDuration();

      // If video ended, advance to next
      if (total > 0 && current >= total - 0.5) {
        // 0.5s buffer
        const nextIndex = (currentIndexRef.current + 1) % items.length;
        const nextItem = items[nextIndex];
        currentIndexRef.current = nextIndex;

        // Load and autoplay next video
        playerRef.current.load(extractYoutubeID(nextItem.channel.url), 0);
        playerRef.current.play();

        setCurrentTitle(nextItem.channel.title || "");

        // Preload next thumbnail
        const followingIndex = (nextIndex + 1) % items.length;
        new Image().src = `https://img.youtube.com/vi/${extractYoutubeID(items[followingIndex].channel.url)}/hqdefault.jpg`;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [mode, items, playerRef]);

  useEffect(() => {
    if (!playerReady) return;
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current!);
  }, [playerReady, isLive, loop]);

  // ----- Mini player behavior -----
  useEffect(() => {
    if (!playerRef.current) return;

    if (mode === "GLOBAL") return;

    if (miniPlayerActive) {
      playerRef.current.pause();
      playerRef.current.mute();
    } else {
      if (!isMuted) playerRef.current.unmute();
      if (isPlaying) playerRef.current.play();
    }
  }, [miniPlayerActive, isMuted, isPlaying, playerRef, mode]);

  // ----- Track current time & duration -----
  useEffect(() => {
    if (!playerRef.current) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
    }, 500);

    return () => clearInterval(interval);
  }, [playerRef]);

  // Auto PiP on tab change
  useEffect(() => {
    if (mode === "GLOBAL") return;
    const onVisibility = () => {
      if (document.hidden) setMiniPlayerActive(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mode]);

  // Auto PiP on route change
  useEffect(() => {
    if (mode === "GLOBAL") return;
    const handleBeforeUnload = () => setMiniPlayerActive(true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const current = items[currentIndexRef.current] || items[0];
  if (!current) return null;

  // ----- Player controls -----
  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unmute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const stopPlayer = () => {
    if (!playerRef.current) return;
    playerRef.current.stop();
    setIsPlaying(false);
  };

  const seekTo = (time: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(time);
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${
        isFullscreen ? "h-screen bg-black" : "h-[350px]"
      }`}
    >
      <div id="preview-animation-root" />

      {/* Main TV Player - stays in layout */}
      <div className="flex size-full gap-3">
        <div className="flex flex-col gap-3">
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

          <button onClick={toggleMute}>
            {isMuted ? (
              <VolumeX className="size-5" />
            ) : (
              <Volume2 className="size-5" />
            )}
          </button>

          <button onClick={handleMaximize}>
            <Maximize className="size-5" />
          </button>
        </div>

        <div className="w-full">
          {isLive && mode === "GLOBAL" && (
            <div className="bg-destructive absolute top-1 right-1 p-1 text-xs font-medium text-white">
              LIVE
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 left-8 z-50 flex h-[350px] w-[300px] items-center justify-center bg-black text-lg font-medium text-white">
              <LoaderCircle className="text-primary size-10 animate-spin" />
            </div>
          )}

          <TvPlayer
            ref={playerRef}
            key="tv-player"
            videoUrl={current.channel.url}
            autoplay
            onReady={() => {
              setPlayerReady(true);
              setIsLoading(false);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onMuteChange={muted => setIsMuted(muted)}
          />

          <div className="absolute right-2 bottom-12 left-10 truncate text-sm font-medium text-white">
            {currentTitle}
          </div>

          {/* Player controls */}
          <div className="absolute right-2 bottom-6 left-10 z-10">
            {/* Seek bar */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={e => seekTo(parseFloat(e.target.value))}
              className="accent-primary h-2 w-full rounded-full"
            />
          </div>

          <div className="absolute right-2 bottom-2 left-10">
            <div className="flex items-center justify-between text-xs text-white">
              <span>{formatTime(currentTime)}</span>{" "}
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Player Overlay */}
      {miniPlayerActive && mode !== "GLOBAL" && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            width: window.innerWidth < 500 ? 250 : 310,
            height: window.innerWidth < 500 ? 140 : 174,
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
            videoUrl={current.channel.url}
            autoplay
            onReady={() => setPlayerReady(true)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onMuteChange={muted => setIsMuted(muted)}
            miniPlayerActive={true}
          />
        </div>
      )}
    </div>
  );
};
