"use client";

import type { ReactNode } from "react";

type Props = {
  onPlayPause: () => void;
  onStop: () => void;
  onMute: () => void;
  isPlaying: boolean;
  isMuted: boolean;
  showLive?: boolean;
  onLive?: () => void;
  modeLabel?: string;
  seekSlot?: ReactNode;
  extra?: ReactNode;
};

export function WatchTransportBar({
  onPlayPause,
  onStop,
  onMute,
  isPlaying,
  isMuted,
  showLive,
  onLive,
  modeLabel,
  seekSlot,
  extra,
}: Props) {
  return (
    <div className="watch-transport-bar flex flex-wrap items-center justify-center gap-3 border-t border-white/20 bg-black/80 px-4 py-4">
      {modeLabel ? (
        <span className="text-[2vmin] font-semibold tracking-wide text-white/80 uppercase">
          {modeLabel}
        </span>
      ) : null}
      <button
        type="button"
        className="watch-transport-btn rounded-lg bg-white/10 px-4 py-3 text-white hover:bg-white/20"
        onClick={onPlayPause}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        className="watch-transport-btn rounded-lg bg-white/10 px-4 py-3 text-white hover:bg-white/20"
        onClick={onStop}
      >
        Stop
      </button>
      <button
        type="button"
        className="watch-transport-btn rounded-lg bg-white/10 px-4 py-3 text-white hover:bg-white/20"
        onClick={onMute}
      >
        {isMuted ? "Unmute" : "Mute"}
      </button>
      {showLive && onLive ? (
        <button
          type="button"
          className="watch-transport-btn rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500"
          onClick={onLive}
        >
          Back to Live
        </button>
      ) : null}
      {seekSlot}
      {extra}
    </div>
  );
}
