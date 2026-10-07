export const EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS = 8_000;

export type ExploreNeverPlayingRecoveryInput = {
  /** Active Explore reel, surface visible, not tip drawer, not user-paused after play. */
  eligible: boolean;
  isBuffering: boolean;
  hasReachedPlaying: boolean;
  watchKey: string;
};

export type ExploreNeverPlayingRecoveryState = {
  armedKey: string | null;
  waitingSinceMs: number | null;
};

export const INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE: ExploreNeverPlayingRecoveryState =
  {
    armedKey: null,
    waitingSinceMs: null,
  };

export function isExploreNeverPlayingRecoveryEligible(input: {
  feedSurfaceActive: boolean;
  playbackActive: boolean;
  tipDrawerOpen: boolean;
  userIntentionallyPaused: boolean;
}): boolean {
  return (
    input.feedSurfaceActive &&
    input.playbackActive &&
    !input.tipDrawerOpen &&
    !input.userIntentionallyPaused
  );
}

export function reduceExploreNeverPlayingRecovery(
  prev: ExploreNeverPlayingRecoveryState,
  input: ExploreNeverPlayingRecoveryInput,
  nowMs: number,
  thresholdMs = EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS
): { state: ExploreNeverPlayingRecoveryState; showTapToPlay: boolean } {
  const empty = { ...INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE };

  if (!input.eligible || input.hasReachedPlaying) {
    return { state: empty, showTapToPlay: false };
  }

  if (input.isBuffering) {
    return {
      state: {
        armedKey: input.watchKey,
        waitingSinceMs: null,
      },
      showTapToPlay: false,
    };
  }

  let next: ExploreNeverPlayingRecoveryState = { ...prev };

  if (next.armedKey !== input.watchKey) {
    next = { armedKey: input.watchKey, waitingSinceMs: null };
  }

  if (next.waitingSinceMs == null) {
    next = { ...next, waitingSinceMs: nowMs };
  }

  const showTapToPlay =
    next.waitingSinceMs != null && nowMs - next.waitingSinceMs >= thresholdMs;

  return { state: next, showTapToPlay };
}
