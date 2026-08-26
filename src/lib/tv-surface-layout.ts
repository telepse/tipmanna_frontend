import {
  SURFACE_MOBILE_MAX_PX,
  SURFACE_TABLET_MAX_PX,
} from "@/lib/surface-breakpoints";

export type TvSurfaceMode =
  | "phonePortrait"
  | "phoneLandscape"
  | "tablet"
  | "desktop";

export function resolveTvSurfaceMode(opts: {
  width: number;
  height: number;
  landscape: boolean;
}): TvSurfaceMode | null {
  const { width, height, landscape } = opts;
  if (width <= 0 || height <= 0) return null;

  if (landscape && height <= SURFACE_MOBILE_MAX_PX) {
    return "phoneLandscape";
  }
  if (width <= SURFACE_MOBILE_MAX_PX) {
    return "phonePortrait";
  }
  if (width <= SURFACE_TABLET_MAX_PX) {
    return "tablet";
  }
  return "desktop";
}

export function isPhoneSurface(
  mode: TvSurfaceMode | null | undefined
): mode is "phonePortrait" | "phoneLandscape" {
  return mode === "phonePortrait" || mode === "phoneLandscape";
}

export function isWideSurface(
  mode: TvSurfaceMode | null | undefined
): mode is "tablet" | "desktop" {
  return mode === "tablet" || mode === "desktop";
}

export type TvLooperLayout = "mobileInline" | "mobileImmersive" | "wideInline";

export function tvLooperLayoutFromSurfaceMode(
  mode: TvSurfaceMode | null,
  userFullView: boolean
): TvLooperLayout {
  if (mode === "phoneLandscape" || (isPhoneSurface(mode) && userFullView)) {
    return "mobileImmersive";
  }
  if (isWideSurface(mode)) {
    return "wideInline";
  }
  return "mobileInline";
}
