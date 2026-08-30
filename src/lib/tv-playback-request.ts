/** Reasons for centralized TV playback orchestration (Phase 3). */
export type TvPlaybackRequestReason =
  | "syncToLive"
  | "loadLocal"
  | "enforcement"
  | "error_reload"
  | "startup_error_recovery"
  | "startup_error_advance";

export type TvPlaybackRequest = {
  reason: TvPlaybackRequestReason;
  videoId: string;
  startSeconds: number;
  scheduleIndex?: number;
};

export function isSameOrchestratedPlayback(
  a: { videoId: string; startSeconds: number } | null,
  b: { videoId: string; startSeconds: number }
): boolean {
  if (!a) return false;
  return (
    a.videoId === b.videoId && Math.abs(a.startSeconds - b.startSeconds) < 1
  );
}

const USER_INTENT_REASONS = new Set<TvPlaybackRequestReason>([
  "loadLocal",
  "enforcement",
]);

export function isUserIntentPlaybackReason(
  reason: TvPlaybackRequestReason
): boolean {
  return USER_INTENT_REASONS.has(reason);
}
