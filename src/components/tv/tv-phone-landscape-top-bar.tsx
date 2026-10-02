"use client";

import { CalendarDays, ListMusic, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { TvModeSelector } from "./tv-mode-selector";

type Props = {
  onClose: () => void;
  onOpenPreviewPlaylist: () => void;
  onOpenSchedule: () => void;
  className?: string;
};

export function TvPhoneLandscapeTopBar({
  onClose,
  onOpenPreviewPlaylist,
  onOpenSchedule,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "relative z-[1200] flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/90 px-3 py-2",
        "pt-[max(0.35rem,env(safe-area-inset-top,0px))]",
        className
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close landscape layout"
        className="rounded-md p-1.5 text-white hover:bg-white/10"
      >
        <X className="size-5" />
      </button>

      <TvModeSelector variant="phoneLandscapeBar" />

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onOpenPreviewPlaylist}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-white hover:bg-white/10 sm:px-2 sm:text-xs"
          aria-label="Open TV preview playlist"
        >
          <ListMusic className="size-3.5 sm:size-4" />
          <span className="whitespace-nowrap">TV Playlist</span>
        </button>
        <button
          type="button"
          onClick={onOpenSchedule}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-white hover:bg-white/10 sm:px-2 sm:text-xs"
          aria-label="Open full TV schedule"
        >
          <CalendarDays className="size-3.5 sm:size-4" />
          <span className="whitespace-nowrap">Schedule</span>
        </button>
      </div>
    </div>
  );
}
