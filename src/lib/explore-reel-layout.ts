import type { YoutubeVideoClassification } from "./youtube-immersive-meta";

export type ExploreReelLayoutMode =
  | "mobilePortrait"
  | "mobileLandscape"
  | "desktopPortrait"
  | "desktopLandscape";

export type ExploreReelTitlePlacement = "onVideo" | "aboveDock";

/** CSS variable set on each slide for tap capture + title offset (mobile). */
export const EXPLORE_REEL_DOCK_HEIGHT = "4.75rem";

/** Taller dock when engage scrubber is visible inside the gradient footer (mobile). */
export const EXPLORE_REEL_DOCK_HEIGHT_ENGAGED = "6.5rem";

/** Desktop dock chrome — proportionally larger than mobile. */
export const EXPLORE_REEL_DOCK_HEIGHT_DESKTOP = "5.75rem";

export const EXPLORE_REEL_DOCK_HEIGHT_ENGAGED_DESKTOP = "8rem";

export function exploreReelIsDesktopMode(mode: ExploreReelLayoutMode): boolean {
  return mode === "desktopPortrait" || mode === "desktopLandscape";
}

export function exploreReelDockHeightCss(
  mode: ExploreReelLayoutMode,
  engageScrubberVisible: boolean
): string {
  if (exploreReelIsDesktopMode(mode)) {
    return engageScrubberVisible
      ? EXPLORE_REEL_DOCK_HEIGHT_ENGAGED_DESKTOP
      : EXPLORE_REEL_DOCK_HEIGHT_DESKTOP;
  }
  return engageScrubberVisible
    ? EXPLORE_REEL_DOCK_HEIGHT_ENGAGED
    : EXPLORE_REEL_DOCK_HEIGHT;
}

function isPortraitLike(
  classification: YoutubeVideoClassification | null
): boolean {
  if (!classification) return false;
  return classification === "portrait" || classification === "square";
}

export function resolveExploreReelLayoutMode(params: {
  isMobile: boolean;
  classification: YoutubeVideoClassification | null;
}): ExploreReelLayoutMode {
  const portrait = isPortraitLike(params.classification);
  if (params.isMobile) {
    return portrait ? "mobilePortrait" : "mobileLandscape";
  }
  return portrait ? "desktopPortrait" : "desktopLandscape";
}

/**
 * While metadata is loading: Shorts URL → portrait path.
 * Mobile unknown → portrait-ambiguous (immersive) rather than landscape stage.
 */
export function resolveExploreReelLayoutModeWhileLoading(params: {
  isMobile: boolean;
  isShortsUrl: boolean;
}): ExploreReelLayoutMode {
  if (params.isShortsUrl) {
    return params.isMobile ? "mobilePortrait" : "desktopPortrait";
  }
  if (params.isMobile) {
    return "mobilePortrait";
  }
  return "desktopLandscape";
}

/** Portrait upgrade when stronger metadata arrives (avoids cover→contain flicker). */
export function shouldUpgradeExploreReelLayoutMode(
  prev: ExploreReelLayoutMode,
  next: ExploreReelLayoutMode
): boolean {
  if (prev === next) return false;
  if (prev === "mobileLandscape" && next === "mobilePortrait") return true;
  if (prev === "desktopLandscape" && next === "desktopPortrait") return true;
  return false;
}

/** Correct portrait-ambiguous loading default once landscape metadata is confirmed. */
export function shouldCorrectExploreReelLayoutMode(
  prev: ExploreReelLayoutMode,
  next: ExploreReelLayoutMode,
  classification: YoutubeVideoClassification | null,
  metadataResolved: boolean
): boolean {
  if (!metadataResolved || prev === next || classification !== "landscape") {
    return false;
  }
  if (prev === "mobilePortrait" && next === "mobileLandscape") return true;
  if (prev === "desktopPortrait" && next === "desktopLandscape") return true;
  return false;
}

export function shouldUpdateExploreReelLayoutMode(
  prev: ExploreReelLayoutMode,
  next: ExploreReelLayoutMode,
  classification: YoutubeVideoClassification | null,
  metadataResolved: boolean
): boolean {
  if (prev === next) return false;
  if (shouldUpgradeExploreReelLayoutMode(prev, next)) return true;
  return shouldCorrectExploreReelLayoutMode(
    prev,
    next,
    classification,
    metadataResolved
  );
}

export function exploreReelPresentationFit(
  mode: ExploreReelLayoutMode
): "cover" | "contain" {
  return mode === "mobileLandscape" ? "contain" : "cover";
}

export function exploreReelTitlePlacement(
  mode: ExploreReelLayoutMode
): ExploreReelTitlePlacement {
  return mode === "mobileLandscape" ? "aboveDock" : "onVideo";
}

export function exploreReelStageClassName(mode: ExploreReelLayoutMode): string {
  switch (mode) {
    case "mobilePortrait":
      return "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden";
    case "mobileLandscape":
      return "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden";
    case "desktopPortrait":
      return "relative mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[min(480px,100%)] flex-col overflow-hidden";
    case "desktopLandscape":
      return "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden";
  }
}

export function exploreReelVideoBandClassName(
  mode: ExploreReelLayoutMode
): string {
  if (mode === "mobileLandscape") {
    return "flex min-h-0 w-full flex-1 flex-col items-center justify-center pb-[var(--explore-reel-dock-h,4.75rem)]";
  }
  return "relative flex min-h-0 min-w-0 flex-1 flex-col";
}

export function exploreReelVideoPlayerClassName(
  _mode: ExploreReelLayoutMode
): string {
  return "min-h-0 min-w-0 flex-1 w-full";
}

export function exploreReelDockClassName(mode: ExploreReelLayoutMode): string {
  const desktop = exploreReelIsDesktopMode(mode);
  return [
    "pointer-events-auto absolute inset-x-0 bottom-0 z-[105]",
    "flex flex-col items-center",
    desktop ? "gap-3 px-5 pt-8" : "gap-2 px-3 pt-6",
    "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
    "bg-gradient-to-t from-black/90 via-black/50 to-transparent",
  ].join(" ");
}

export function exploreReelDockActionsClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "flex flex-wrap items-center justify-center gap-3"
    : "flex flex-wrap items-center justify-center gap-2";
}

export function exploreReelDockScrubberClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "pointer-events-auto z-[88] w-full max-w-full px-2 sm:pr-16"
    : "pointer-events-auto z-[88] w-full max-w-full px-1 sm:pr-14";
}

export function exploreReelTapCaptureClassName(): string {
  return "absolute inset-x-0 top-0 bottom-[var(--explore-reel-dock-h,4.75rem)] z-30";
}

export function exploreReelTitleOnVideoClassName(
  mode: ExploreReelLayoutMode
): string {
  const desktop = exploreReelIsDesktopMode(mode);
  return [
    "pointer-events-auto absolute right-3 left-3 z-[100] space-y-1 text-white",
    desktop ? "right-5 left-5 space-y-1.5" : "",
    "bottom-[calc(var(--explore-reel-dock-h,4.75rem)+0.35rem)]",
  ].join(" ");
}

/** Mobile landscape: title sits above dock/scrubber stack, not on the video picture. */
export function exploreReelTitleAboveDockClassName(
  mode: ExploreReelLayoutMode
): string {
  return [
    "pointer-events-auto absolute right-3 left-3 z-[102] space-y-0.5 text-white",
    "bottom-[calc(var(--explore-reel-dock-h,4.75rem)+0.5rem)]",
    "max-h-[28vh] overflow-hidden",
    exploreReelIsDesktopMode(mode) ? "right-5 left-5" : "",
  ].join(" ");
}

export function exploreReelTitleRowClassName(mode: ExploreReelLayoutMode): string {
  return exploreReelIsDesktopMode(mode)
    ? "flex items-center gap-3 text-lg font-semibold drop-shadow-md"
    : "flex items-center gap-2 text-sm font-semibold drop-shadow-md";
}

export function exploreReelMetricsClassName(mode: ExploreReelLayoutMode): string {
  return exploreReelIsDesktopMode(mode)
    ? "text-sm opacity-85 drop-shadow-md"
    : "text-[11px] opacity-80 drop-shadow-md";
}

export function exploreReelMuteButtonClassName(mode: ExploreReelLayoutMode): string {
  return exploreReelIsDesktopMode(mode)
    ? "cursor-pointer rounded-md bg-black/50 p-2"
    : "cursor-pointer rounded bg-black/50 p-1";
}

export function exploreReelMuteIconClassName(mode: ExploreReelLayoutMode): string {
  return exploreReelIsDesktopMode(mode) ? "size-5 text-white" : "size-4 text-white";
}

export function exploreReelDockPrimaryButtonClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "h-11 gap-1.5 rounded-full rounded-r-none bg-white px-5 text-base text-black shadow-lg"
    : "h-9 gap-1 rounded-full rounded-r-none bg-white px-3 text-sm text-black shadow-lg";
}

export function exploreReelDockSecondaryButtonClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "h-11 gap-1.5 rounded-full rounded-l-none px-6 text-base shadow-lg"
    : "h-9 gap-1 rounded-full rounded-l-none px-4 text-sm shadow-lg";
}

export function exploreReelDockIconButtonClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "gap-1.5 rounded-full px-6 py-2.5 shadow-lg"
    : "gap-1 rounded-full px-5 shadow-lg";
}

export function exploreReelScrubberTrackClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "accent-primary h-1 w-full cursor-pointer appearance-none rounded-full bg-white/25 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
    : "accent-primary h-0.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white";
}

export function exploreReelActionsRailClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "pointer-events-auto absolute top-1/2 right-10 z-[90] -translate-y-1/2"
    : "pointer-events-auto absolute top-1/2 right-8 z-[90] -translate-y-1/2";
}

export function exploreReelRailIconButtonClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "cursor-pointer rounded-md bg-black/50 p-1.5"
    : "cursor-pointer rounded bg-black/50 p-1";
}

export function exploreReelRailIconClassName(mode: ExploreReelLayoutMode): string {
  return exploreReelIsDesktopMode(mode) ? "size-6 text-white" : "size-5 text-white";
}

export function exploreReelRailStackGapClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode) ? "gap-3" : "gap-2";
}

export function exploreReelRailTipsChipClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "cursor-pointer rounded-md bg-black/70 px-2 py-1 text-center text-xs font-medium whitespace-nowrap text-white sm:text-sm"
    : "cursor-pointer rounded-md bg-black/70 px-1.5 py-0.5 text-center text-[10px] font-medium whitespace-nowrap text-white sm:text-xs";
}

export function exploreReelTipsProgressWrapperClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "pointer-events-auto absolute top-1/2 right-5 z-[90] -translate-y-1/2"
    : "pointer-events-auto absolute top-1/2 right-4 z-[90] -translate-y-1/2";
}

export function exploreReelTipsChipClassName(mode: ExploreReelLayoutMode): string {
  return exploreReelIsDesktopMode(mode)
    ? "absolute -top-10 right-0 cursor-pointer rounded-md bg-black/70 px-2 py-1 text-sm font-medium whitespace-nowrap text-white"
    : "absolute -top-8 right-0 cursor-pointer rounded-md bg-black/70 p-1 text-xs font-medium whitespace-nowrap text-white sm:text-sm";
}

export function exploreReelFeatureCardBannerClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "pointer-events-none absolute top-16 left-5 z-[13100] max-w-[min(420px,calc(100vw-3rem))]"
    : "pointer-events-none absolute top-14 left-3 z-[13100] max-w-[min(360px,calc(100vw-3rem))]";
}

export function exploreReelDockActionIconClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode) ? "size-5" : "size-4";
}

export function exploreReelTitleCommentButtonClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode)
    ? "-ml-2 inline-flex shrink-0 cursor-pointer items-center rounded border border-gray-400 p-1.5"
    : "-ml-2 inline-flex shrink-0 cursor-pointer items-center rounded border border-gray-400 p-1";
}

export function exploreReelTitleCommentIconClassName(
  mode: ExploreReelLayoutMode
): string {
  return exploreReelIsDesktopMode(mode) ? "size-5" : "size-4";
}
