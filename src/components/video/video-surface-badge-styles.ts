/** Shared compact video corner chip (community + co-owner badges). */
export const VIDEO_SURFACE_BADGE_CHIP =
  "flex size-[22px] shrink-0 items-center justify-center rounded-full shadow-md ring-1 ring-white/30 transition hover:scale-105 hover:ring-white/50";

export const VIDEO_SURFACE_BADGE_LABEL =
  "absolute top-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-xs font-medium whitespace-nowrap text-black shadow-lg ring-1 ring-black/10 transition";

export function videoSurfaceBadgeLabelPos(
  position: "top-left" | "top-right"
): string {
  return position === "top-right" ? "right-full mr-2" : "left-full ml-2";
}
