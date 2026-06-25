import type { YoutubeVideoClassification } from "./youtube-immersive-meta";

export type ExploreReelLayoutMode =
  | "mobilePortrait"
  | "mobileLandscape"
  | "desktopPortrait"
  | "desktopLandscape";

export type ExploreReelTitlePlacement = "onVideo" | "belowVideoBand";

/** CSS variable set on each slide for tap capture + title offset. */
export const EXPLORE_REEL_DOCK_HEIGHT = "4.75rem";

/** Taller dock when engage scrubber is visible inside the gradient footer. */
export const EXPLORE_REEL_DOCK_HEIGHT_ENGAGED = "6.5rem";

export function exploreReelDockHeightCss(
  engageScrubberVisible: boolean
): string {
  return engageScrubberVisible
    ? EXPLORE_REEL_DOCK_HEIGHT_ENGAGED
    : EXPLORE_REEL_DOCK_HEIGHT;
}

function isPortraitLike(
  classification: YoutubeVideoClassification | null,
  isShortsUrl: boolean
): boolean {
  if (isShortsUrl) return true;
  if (!classification) return false;
  return classification === "portrait" || classification === "square";
}

export function resolveExploreReelLayoutMode(params: {
  isMobile: boolean;
  classification: YoutubeVideoClassification | null;
  isShortsUrl: boolean;
}): ExploreReelLayoutMode {
  const portrait = isPortraitLike(params.classification, params.isShortsUrl);
  if (params.isMobile) {
    return portrait ? "mobilePortrait" : "mobileLandscape";
  }
  return portrait ? "desktopPortrait" : "desktopLandscape";
}

/** While oEmbed is loading: landscape unless URL is Shorts (force portrait path). */
export function resolveExploreReelLayoutModeWhileLoading(params: {
  isMobile: boolean;
  isShortsUrl: boolean;
}): ExploreReelLayoutMode {
  if (params.isShortsUrl) {
    return params.isMobile ? "mobilePortrait" : "desktopPortrait";
  }
  return params.isMobile ? "mobileLandscape" : "desktopLandscape";
}

export function exploreReelPresentationFit(
  mode: ExploreReelLayoutMode
): "cover" | "contain" {
  return mode === "mobileLandscape" ? "contain" : "cover";
}

export function exploreReelTitlePlacement(
  mode: ExploreReelLayoutMode
): ExploreReelTitlePlacement {
  return mode === "mobileLandscape" ? "belowVideoBand" : "onVideo";
}

export function exploreReelStageClassName(mode: ExploreReelLayoutMode): string {
  switch (mode) {
    case "mobilePortrait":
      return "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden";
    case "mobileLandscape":
      return "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden";
    case "desktopPortrait":
      return "relative mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[min(420px,100%)] flex-col overflow-hidden";
    case "desktopLandscape":
      return "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden";
  }
}

export function exploreReelVideoBandClassName(
  mode: ExploreReelLayoutMode
): string {
  if (mode === "mobileLandscape") {
    return "flex min-h-0 w-full flex-1 flex-col items-center justify-center";
  }
  return "relative flex min-h-0 min-w-0 flex-1 flex-col";
}

export function exploreReelVideoPlayerClassName(
  _mode: ExploreReelLayoutMode
): string {
  return "min-h-0 min-w-0 flex-1 w-full";
}

export function exploreReelDockClassName(): string {
  return [
    "pointer-events-auto absolute inset-x-0 bottom-0 z-[105]",
    "flex flex-col items-center gap-2 px-3 pt-6",
    "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
    "bg-gradient-to-t from-black/90 via-black/50 to-transparent",
  ].join(" ");
}

export function exploreReelDockActionsClassName(): string {
  return "flex flex-wrap items-center justify-center gap-2";
}

export function exploreReelDockScrubberClassName(): string {
  return "pointer-events-auto z-[88] w-full max-w-full px-1 sm:pr-14";
}

export function exploreReelTapCaptureClassName(): string {
  return "absolute inset-x-0 top-0 bottom-[var(--explore-reel-dock-h,4.75rem)] z-30";
}

export function exploreReelTitleOnVideoClassName(): string {
  return "pointer-events-auto absolute right-3 left-3 z-[100] space-y-1 text-white bottom-[calc(var(--explore-reel-dock-h,4.75rem)+0.35rem)]";
}

export function exploreReelTitleBelowBandClassName(): string {
  return "pointer-events-auto relative z-[100] shrink-0 space-y-1 px-3 pt-1 pb-1 text-white";
}
