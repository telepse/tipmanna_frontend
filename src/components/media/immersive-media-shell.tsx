"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ImmersiveLayoutMode } from "@/lib/youtube-immersive-meta";

type TopBarProps = {
  onClose: () => void;
  title?: ReactNode;
  trailing?: ReactNode;
};

export function ImmersiveMediaTopBar({
  onClose,
  title,
  trailing,
}: TopBarProps) {
  return (
    <div
      className={cn(
        "relative z-[1110] flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/90",
        "px-[max(1rem,env(safe-area-inset-left,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))]",
        "pr-[max(1rem,env(safe-area-inset-right,0px))] pb-2 text-white"
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 hover:bg-white/10"
        aria-label="Exit full view"
      >
        <X className="size-6" />
      </button>
      <div className="min-w-0 flex-1 truncate text-center text-sm">{title}</div>
      <div className="shrink-0">{trailing}</div>
    </div>
  );
}

/**
 * Full-view overlay: one viewport tall, column chrome; does not depend on device rotation.
 */
export function immersiveFullViewViewportClassName(
  variant: "channel" | "tv"
): string {
  const surface =
    variant === "channel" ? "bg-zinc-950 text-white" : "bg-black text-white";
  return cn(
    "fixed inset-0 z-[1100] flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-none flex-col overflow-hidden",
    "pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]",
    surface
  );
}

/**
 * Wrapper around the video + overlays. FULL_LANDSCAPE: horizontal flex row sibling to rail;
 * FULL_PORTRAIT: vertical stack — rail shrink-0, stage flex-1 (video not crushed).
 */
export function immersivePlayerStageClassName(
  immersiveOpen: boolean,
  isMobile: boolean,
  layoutMode: ImmersiveLayoutMode
): string {
  if (!immersiveOpen || !isMobile) {
    return "relative h-fit w-full sm:h-full";
  }
  if (layoutMode === "portrait_video") {
    return "relative flex min-h-0 w-full min-w-0 flex-1 basis-0 flex-col overflow-hidden";
  }
  return "relative min-h-0 w-full min-w-0 flex-1 basis-0 overflow-hidden";
}

/** Main row: controls + player — FULL_LANDSCAPE = horizontal row; FULL_PORTRAIT = vertical column. */
export function immersiveMainRowClassName(
  immersiveOpen: boolean,
  isMobile: boolean,
  layoutMode: ImmersiveLayoutMode
): string {
  if (!immersiveOpen || !isMobile) {
    return "flex h-full w-full gap-4";
  }
  if (layoutMode === "portrait_video") {
    return "flex min-h-0 w-full flex-1 flex-col items-stretch gap-2 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]";
  }
  return "relative flex min-h-0 w-full flex-1 flex-col px-0 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]";
}

/**
 * Mobile full-view bottom dock for scrubber + “now playing” text.
 * Clears the left control rail in landscape; full width in portrait.
 */
export function immersiveMobileScrubberDockClassName(
  layoutMode: ImmersiveLayoutMode
): string {
  if (layoutMode === "portrait_video") {
    return cn(
      "fixed z-[1110] bottom-0 left-0 right-0 w-full px-2 pt-1",
      "pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]",
      "bg-gradient-to-t from-black/90 via-black/45 to-transparent"
    );
  }
  return cn(
    "fixed z-[1110] bottom-0 left-0 right-0 pt-1",
    "pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pl-11 pr-2",
    "bg-gradient-to-t from-black/90 via-black/45 to-transparent"
  );
}

/** Save / share / info column — keeps off bottom safe area; landscape stays right; portrait tucks right. */
export function immersiveInPlayerSecondaryActionsClassName(
  immersiveOpen: boolean,
  isMobile: boolean,
  layoutMode: ImmersiveLayoutMode
): string {
  const base =
    "absolute z-[1000] flex flex-col items-center gap-2 pointer-events-auto";
  if (!immersiveOpen || !isMobile) {
    return cn(base, "right-10 bottom-4");
  }
  if (layoutMode === "portrait_video") {
    return cn(
      base,
      "right-[max(0.35rem,env(safe-area-inset-right,0px))]",
      "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))]"
    );
  }
  return cn(
    base,
    "right-[max(0.35rem,env(safe-area-inset-right,0px))]",
    "bottom-[max(0.85rem,env(safe-area-inset-bottom,0px))]"
  );
}

/** Tips count + progress — landscape: left of action stack; portrait: opposite corner. */
export function immersiveInPlayerMetricsClusterClassName(
  immersiveOpen: boolean,
  isMobile: boolean,
  layoutMode: ImmersiveLayoutMode
): string {
  if (!immersiveOpen || !isMobile) {
    return "absolute right-4 bottom-4 z-[999] flex flex-col items-center gap-4";
  }
  if (layoutMode === "portrait_video") {
    return cn(
      "absolute z-[999] flex flex-col items-center gap-4",
      "left-[max(0.35rem,env(safe-area-inset-left,0px))]",
      "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))]"
    );
  }
  return cn(
    "absolute z-[999] flex flex-col items-end gap-4",
    "right-[4.25rem]",
    "bottom-[max(0.85rem,env(safe-area-inset-bottom,0px))]"
  );
}

/** Left control rail: stack vertically in landscape immersive; horizontal strip in portrait immersive. */
export function immersiveControlRailClassName(
  immersiveOpen: boolean,
  isMobile: boolean,
  layoutMode: ImmersiveLayoutMode
): string {
  const base = "flex gap-3";
  if (!immersiveOpen || !isMobile) return `${base} flex-col`;
  if (layoutMode === "portrait_video") {
    return `${base} shrink-0 flex-row flex-wrap items-center justify-center gap-2 py-1`;
  }
  return cn(
    base,
    "pointer-events-auto absolute z-[1110] flex-col justify-center gap-2",
    "left-[max(0.25rem,env(safe-area-inset-left,0px))] top-1/2 -translate-y-1/2"
  );
}

/**
 * Mobile inline (non–full-view) stack — content/channel clients.
 * Tighter offsets reduce dead space between player and tip UI on iPhone.
 */
export const mobileInlinePlayerBoundsClass =
  "absolute top-[calc(env(safe-area-inset-top,0px)+2.5rem)] right-2 left-2 bottom-[calc(env(safe-area-inset-bottom,0px)+17.5rem)]";

export const mobileInlineScrubberDockClass =
  "absolute right-2 left-2 bottom-[calc(env(safe-area-inset-bottom,0px)+12.5rem)] w-auto px-2 py-0.5";

export const mobileInlineTipSectionClass =
  "absolute right-2 left-2 bottom-[calc(env(safe-area-inset-bottom,0px)+4rem)] mx-0 h-[min(8.5rem,32dvh)] w-auto overflow-hidden rounded-t-xl bg-white/95 px-2 py-1";

export const mobileInlineActionRailBottomClass = "bottom-20";
export const mobileInlineActionRailBottomSmClass = "bottom-4";
