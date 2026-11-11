/**
 * Explore reel activation: unlock scrubber via onEngageUnlocked when the slide
 * becomes playback-active. Player may not be ready on the first effect tick.
 */

export const EXPLORE_ACTIVATION_READY_RETRY_MS = 120;
export const EXPLORE_ACTIVATION_READY_MAX_ATTEMPTS = 8;

export function shouldUnmuteOnExploreReelActivation(
  wantsSound: boolean,
  deferProgrammaticUnmute: boolean
): boolean {
  return wantsSound && !deferProgrammaticUnmute;
}
