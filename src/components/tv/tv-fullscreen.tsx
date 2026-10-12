/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import {
  CircleStop,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import TvPlayer, { TvPlayerRef } from "./tv-player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";
import { readTvMutePref, unmuteOnly, writeTvMutePref } from "@/lib/tv-autoplay";
import {
  initTvFullscreenAnalyticsRuntime,
  syncTvFullscreenAnalyticsContext,
  trackTvFullscreenVideoComplete,
  trackTvFullscreenVideoEncounter,
  trackTvFullscreenVideoStart,
  trackTvFullscreenWatchDuration,
} from "@/lib/analytics/tv-fullscreen-analytics";

type Props = {
  videoId: string;
  currentChannel: any;
};

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function TVFullscreen({ videoId, currentChannel }: Props) {
  const router = useRouter();

  useYoutubeVideoAspect(`https://www.youtube.com/watch?v=${videoId}`);

  const playerRef = useRef<TvPlayerRef>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => readTvMutePref());

  const analyticsCtx = useMemo(
    () => ({
      eventId: currentChannel?.event?.id ?? null,
      channelId: currentChannel?.id ? String(currentChannel.id) : null,
      communityId: null as string | null,
    }),
    [currentChannel]
  );

  const prevPlayingForStartRef = useRef(false);
  const watchSegStartRef = useRef(0);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    initTvFullscreenAnalyticsRuntime();
  }, []);

  useEffect(() => {
    void syncTvFullscreenAnalyticsContext(analyticsCtx);
  }, [analyticsCtx]);

  useEffect(() => {
    if (isPlaying && !prevPlayingForStartRef.current) {
      trackTvFullscreenVideoStart(analyticsCtx, 0);
    }
    prevPlayingForStartRef.current = isPlaying;
  }, [isPlaying, analyticsCtx]);

  useEffect(() => {
    if (!isPlaying) {
      if (watchSegStartRef.current > 0) {
        const sec = (Date.now() - watchSegStartRef.current) / 1000;
        watchSegStartRef.current = 0;
        if (sec > 0.3) {
          trackTvFullscreenWatchDuration(analyticsCtx, Math.min(sec, 600));
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
        trackTvFullscreenWatchDuration(analyticsCtx, Math.min(sec, 300));
      }
    }, 15_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (watchSegStartRef.current > 0) {
          const s = (Date.now() - watchSegStartRef.current) / 1000;
          watchSegStartRef.current = 0;
          if (s > 0.3) {
            trackTvFullscreenWatchDuration(analyticsCtx, Math.min(s, 300));
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
          trackTvFullscreenWatchDuration(analyticsCtx, Math.min(sec, 300));
        }
      }
    };
  }, [isPlaying, analyticsCtx]);

  useEffect(() => {
    return () => {
      trackTvFullscreenVideoComplete(analyticsCtx);
    };
  }, [analyticsCtx]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current?.isReady()) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
        setIsMuted(playerRef.current.isMuted());
        const state = playerRef.current.getPlayerState();
        setIsPlaying(state === "PLAYING" || state === "BUFFERING");
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player?.isReady()) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player?.isReady()) return;
    if (isMuted) {
      unmuteOnly(player, "tv_fullscreen_mute_btn");
      setIsMuted(false);
      writeTvMutePref(false);
    } else {
      player.mute();
      setIsMuted(true);
      writeTvMutePref(true);
    }
  }, [isMuted]);

  const stopPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player?.isReady()) return;
    player.stop();
    setIsPlaying(false);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="flex h-full w-full gap-4 p-4">
        {/* LEFT CONTROL RAIL */}
        <div className="flex flex-col justify-start gap-4 pt-12">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-6 text-black" />
            ) : (
              <Play className="size-6 text-black" />
            )}
          </button>

          <button
            type="button"
            onClick={stopPlayback}
            aria-label="Stop"
          >
            <CircleStop className="size-7 fill-white text-black" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="size-6 text-black" />
            ) : (
              <Volume2 className="size-6 text-black" />
            )}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Exit fullscreen"
          >
            <Minimize className="size-6 text-black" />
          </button>
        </div>

        {/* RIGHT VIDEO SECTION */}
        <div className="relative flex flex-1 flex-col">
          {/* Top Info Bar */}
          <div className="flex items-center justify-between pb-2 text-xs text-black">
            <div>
              Host: {currentChannel.event.hostName.split(" ")[0]}
              <span className="text-primary ml-1">
                (@{currentChannel.event.username})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="bg-moonstone-blue size-3 rounded-full" />
              <span>0 online</span>
            </div>
          </div>

          {/* Video Player */}
          <div className="relative flex-1 overflow-hidden rounded-md bg-white">
            <TvPlayer
              ref={playerRef}
              videoUrl={`https://www.youtube.com/watch?v=${videoId}`}
              autoplay
              cover
              onPlaybackReady={() => {
                trackTvFullscreenVideoEncounter(analyticsCtx, {
                  scheduleIndex: 0,
                  isPlaying: isPlayingRef.current,
                });
              }}
              onPlay={() => {
                const dur = playerRef.current?.getDuration() ?? 0;
                setDuration(dur);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          {/* Bottom Controls */}
          <div className="pt-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              step={0.1}
              onChange={e => {
                const seekTo = parseFloat(e.target.value);
                playerRef.current?.seekTo(seekTo);
                setCurrentTime(seekTo);
              }}
              className="accent-primary h-2 w-full rounded-full"
            />

            <div className="mt-1 flex justify-between text-xs text-black">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <h4 className="mt-2 text-xs font-medium text-black">
              {currentChannel.title}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
