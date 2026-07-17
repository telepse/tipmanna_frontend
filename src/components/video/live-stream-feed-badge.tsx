"use client";

import { Radio } from "lucide-react";

import { cn } from "@/lib/utils";

type LiveStatus = "LIVE" | "ENDED" | "UPCOMING" | "NOT_LIVE" | string | null;

type Props = {
  liveStatus?: LiveStatus;
  className?: string;
};

export function liveStreamFeedBadgeVisible(liveStatus: LiveStatus): boolean {
  return liveStatus === "LIVE" || liveStatus === "ENDED";
}

export function liveStreamFeedBadgeLabel(
  liveStatus: LiveStatus
): string | null {
  if (liveStatus === "LIVE") return "Live stream";
  if (liveStatus === "ENDED") return "Live stream · Completed";
  return null;
}

export function LiveStreamFeedBadge({ liveStatus, className }: Props) {
  const label = liveStreamFeedBadgeLabel(liveStatus ?? null);
  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
        liveStatus === "LIVE"
          ? "bg-red-600 text-white"
          : "bg-black/60 text-white/90",
        className
      )}
    >
      <Radio
        className="size-3"
        aria-hidden
      />
      {label}
    </span>
  );
}
