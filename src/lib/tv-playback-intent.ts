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
  queuedAtStartupGeneration: number;
};

export function stampPendingPlaybackRequest(
  req: TvPlaybackRequest,
  globalLiveIntentSeq: number,
  startupGeneration: number
): PendingPlaybackWithIntent {
  return {
    ...req,
    queuedAtGlobalLiveIntentSeq: globalLiveIntentSeq,
    queuedAtStartupGeneration: startupGeneration,
  };
}

/**
 * Newer explicit GLOBAL live intent invalidates older LOCAL loadLocal and
 * deferred syncToLive pending stamped before the latest Go Live bump.
 */
export function shouldExecutePendingPlaybackRequest(
  pending: PendingPlaybackWithIntent,
  globalLiveIntentSeq: number
): boolean {
  if (pending.reason === "loadLocal" || pending.reason === "syncToLive") {
    return pending.queuedAtGlobalLiveIntentSeq >= globalLiveIntentSeq;
  }
  return true;
}
