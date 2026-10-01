import type { TvPlaybackRequest } from "@/lib/tv-playback-request";

/**
 * Monotonic GLOBAL live intent generation. A newer Go Live bumps the seq;
 * older LOCAL pending requests stamped below the current seq must not run.
 */
export function bumpGlobalLiveIntentSeq(seqRef: { current: number }): number {
  seqRef.current += 1;
  return seqRef.current;
}

export type PendingPlaybackWithIntent = TvPlaybackRequest & {
  queuedAtGlobalLiveIntentSeq: number;
};

export function stampPendingPlaybackRequest(
  req: TvPlaybackRequest,
  globalLiveIntentSeq: number
): PendingPlaybackWithIntent {
  return { ...req, queuedAtGlobalLiveIntentSeq: globalLiveIntentSeq };
}

/**
 * Newer explicit GLOBAL live intent invalidates older LOCAL loadLocal only.
 * syncToLive and other reasons are not suppressed by seq alone.
 */
export function shouldExecutePendingPlaybackRequest(
  pending: PendingPlaybackWithIntent,
  globalLiveIntentSeq: number
): boolean {
  if (pending.reason !== "loadLocal") return true;
  return pending.queuedAtGlobalLiveIntentSeq >= globalLiveIntentSeq;
}
