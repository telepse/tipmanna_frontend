import type { RefObject } from "react";

/** Minimal video player API used for feature-card overlay pause/resume. */
export type FeatureCardOverlayPlayer = {
  isReady?: () => boolean;
  pause?: () => void;
  play?: () => void;
};

/**
 * Pause host playback when a feature-card iframe opens; resume only if it was playing.
 * Surface-local — does not enter TV LOCAL mode.
 */
export function createFeatureCardOverlayPlaybackHandlers(
  videoRef: RefObject<FeatureCardOverlayPlayer | null>,
  wasPlayingRef: { current: boolean },
  options?: { getWasPlaying?: () => boolean }
) {
  return (open: boolean) => {
    const player = videoRef.current;
    if (open) {
      wasPlayingRef.current =
        options?.getWasPlaying?.() ?? player?.isReady?.() ?? false;
      player?.pause?.();
    } else if (wasPlayingRef.current) {
      wasPlayingRef.current = false;
      player?.play?.();
    } else {
      wasPlayingRef.current = false;
    }
  };
}
