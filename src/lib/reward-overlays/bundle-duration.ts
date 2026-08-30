import type { TipAnimationEvent } from "@/lib/animation-guard";

/** Companion overlays align to server playback bundle window. */
export function computeBundleOverlayDurationMs(
  data: TipAnimationEvent
): number {
  const { serverTs, playbackEndsAt } = data;
  if (typeof playbackEndsAt === "number" && playbackEndsAt > serverTs) {
    return Math.min(playbackEndsAt - serverTs, 120_000);
  }
  return 60_000;
}
