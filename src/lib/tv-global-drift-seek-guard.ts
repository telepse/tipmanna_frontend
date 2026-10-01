/** YouTube states where currentTime is not a reliable drift signal. */
export const GLOBAL_DRIFT_NON_PROGRESSING_PLAYER_STATES = new Set([
  "BUFFERING",
  "CUED",
  "UNSTARTED",
]);

/**
 * Suppress GLOBAL drift seekTo while the player has not committed playback progress
 * (post-load / buffering), using existing orchestration refs.
 */
export function shouldSuppressGlobalDriftSeek(opts: {
  playerState: string | null;
  inFlightOrchestratedVideoId: string | null;
}): boolean {
  const state = opts.playerState;
  if (state && GLOBAL_DRIFT_NON_PROGRESSING_PLAYER_STATES.has(state)) {
    return true;
  }
  if (opts.inFlightOrchestratedVideoId != null) {
    return true;
  }
  return false;
}
