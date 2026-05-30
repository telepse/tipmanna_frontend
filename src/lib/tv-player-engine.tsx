"use client";

import { useEffect, useState, type RefObject } from "react";
import { useTV } from "@/components/tv-provider";
import TvPlayer from "@/components/tv/tv-player";
import type { TvPlayerRef } from "@/components/tv/tv-player";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";

export default function TVPlayerEngine() {
  const {
    items,
    currentIndex,
    playerRef,
    mode,
    goLive,
    onPlayerPause,
    onPlayerSeek,
    onVideoEnd,
    setPlayerPlayingState,
    playingItemOverride,
  } = useTV();

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setPlayerPlayingState(isPlaying);
  }, [isPlaying, setPlayerPlayingState]);

  const current = playingItemOverride ?? items[currentIndex];
  useYoutubeVideoAspect(current?.channel?.url);

  if (!items.length) return null;
  if (!current) return null;

  return (
    <div className="relative h-[380px] w-full">
      {mode === "GLOBAL" && (
        <div className="absolute top-2 left-2 bg-red-600 px-2 py-1 text-xs text-white">
          LIVE
        </div>
      )}

      {mode === "LOCAL" && (
        <button
          onClick={goLive}
          className="absolute top-2 left-2 bg-black px-2 py-1 text-white"
        >
          Back to Live
        </button>
      )}

      <TvPlayer
        ref={playerRef as RefObject<TvPlayerRef | null>}
        videoUrl={current.channel.url}
        autoplay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onUserPause={onPlayerPause}
        onUserSeek={onPlayerSeek}
        onEnd={onVideoEnd}
      />
    </div>
  );
}
