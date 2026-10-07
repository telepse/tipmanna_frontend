export type TvYoutubePlayerObservationState =
  | "UNSTARTED"
  | "CUED"
  | "BUFFERING"
  | "PLAYING"
  | "PAUSED"
  | "ENDED"
  | null;

export type TvNeverPlayingWatchInput = {
  iframeApiReady: boolean;
  tvReady: boolean;
  isNoticeRow: boolean;
  hasYoutubeUrl: boolean;
  isPaymentActive: boolean;
  playerRefIsNull: boolean;
  startupEmbedGeneration: number;
  watchKey: string;
  playerState: TvYoutubePlayerObservationState;
};

export type TvNeverPlayingWatchState = {
  stuckSinceMs: number | null;
  armedKey: string | null;
  armedGeneration: number | null;
  seenPlaying: boolean;
};

export const INITIAL_TV_NEVER_PLAYING_WATCH_STATE: TvNeverPlayingWatchState = {
  stuckSinceMs: null,
  armedKey: null,
  armedGeneration: null,
  seenPlaying: false,
};

export const TV_NEVER_PLAYING_WARNING_THRESHOLD_MS = 20_000;

function emptyWatchState(): TvNeverPlayingWatchState {
  return { ...INITIAL_TV_NEVER_PLAYING_WATCH_STATE };
}

export function isTvNeverPlayingWatchEligible(
  input: TvNeverPlayingWatchInput
): boolean {
  return (
    input.iframeApiReady &&
    input.tvReady &&
    input.hasYoutubeUrl &&
    !input.isNoticeRow &&
    !input.isPaymentActive
  );
}

export function shouldArmTvNeverPlayingWatch(
  input: TvNeverPlayingWatchInput
): boolean {
  return isTvNeverPlayingWatchEligible(input);
}

/**
 * Pure reducer for Case B — read-only observation; never triggers playback.
 */
export function reduceTvNeverPlayingWatch(
  prev: TvNeverPlayingWatchState,
  input: TvNeverPlayingWatchInput,
  nowMs: number,
  thresholdMs = TV_NEVER_PLAYING_WARNING_THRESHOLD_MS
): { state: TvNeverPlayingWatchState; showCaseB: boolean } {
  if (!isTvNeverPlayingWatchEligible(input)) {
    return { state: emptyWatchState(), showCaseB: false };
  }

  if (input.playerRefIsNull) {
    return {
      state: {
        stuckSinceMs: null,
        armedKey: input.watchKey,
        armedGeneration: input.startupEmbedGeneration,
        seenPlaying: false,
      },
      showCaseB: false,
    };
  }

  let next: TvNeverPlayingWatchState = { ...prev };

  if (
    next.armedKey !== input.watchKey ||
    next.armedGeneration !== input.startupEmbedGeneration
  ) {
    next = {
      stuckSinceMs: null,
      armedKey: input.watchKey,
      armedGeneration: input.startupEmbedGeneration,
      seenPlaying: false,
    };
  }

  if (input.playerState === "PLAYING") {
    return {
      state: { ...next, seenPlaying: true, stuckSinceMs: null },
      showCaseB: false,
    };
  }

  if (
    input.playerState === "BUFFERING" ||
    input.playerState === "PAUSED" ||
    input.playerState === "ENDED"
  ) {
    return {
      state: { ...next, stuckSinceMs: null },
      showCaseB: false,
    };
  }

  if (next.seenPlaying) {
    return { state: next, showCaseB: false };
  }

  if (next.stuckSinceMs == null) {
    next = { ...next, stuckSinceMs: nowMs };
  }

  const showCaseB =
    next.stuckSinceMs != null && nowMs - next.stuckSinceMs >= thresholdMs;

  return { state: next, showCaseB };
}
