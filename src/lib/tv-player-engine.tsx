"use client";

import { useTV } from "@/components/tv-provider";
import TvPlayer from "@/components/tv/tv-player";

export default function TVPlayerEngine() {
  const { items, currentIndex, playerRef, mode, setMode } = useTV();

  if (!items.length) return null;

  const current = items[currentIndex];
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
          onClick={() => {
            setMode("GLOBAL");
            playerRef.current?.stop();
          }}
          className="absolute top-2 left-2 bg-black px-2 py-1 text-white"
        >
          Back to Live
        </button>
      )}

      <TvPlayer
        ref={playerRef}
        videoUrl={current.channel.url}
        autoplay
      />
    </div>
  );
}
