import type { TvPlaybackRequest } from "@/lib/tv-playback-request";
import type { PendingPlaybackWithIntent } from "@/lib/tv-playback-intent";

export type PendingGlobalPlaybackDropReason =
  | "not_global_mode"
  | "intent_superseded"
  | "startup_generation_mismatch"
  | "live_row_video_mismatch"
  | "missing_live_schedule";

export type PreparePendingGlobalPlaybackResult =
  | { action: "drop"; dropReason: PendingGlobalPlaybackDropReason }
  | { action: "execute"; req: TvPlaybackRequest; reResolved: boolean };

export type PreparePendingGlobalPlaybackInput = {
  pending: PendingPlaybackWithIntent;
  modeGlobal: boolean;
  globalLiveIntentSeq: number;
  startupGeneration: number;
  /** Live schedule row index from resolveBroadcastPosition at flush time. */
  liveScheduleIndex: number;
  liveVideoId: string;
  liveOffsetSeconds: number;
};

export function isAutomaticGlobalPendingReason(
  reason: TvPlaybackRequest["reason"]
): boolean {
  return reason === "syncToLive";
}

/**
 * Validates and re-resolves deferred automatic GLOBAL playback before execution.
 * Never returns the original frozen startSeconds for syncToLive.
 */
export function preparePendingGlobalPlaybackForExecution(
  input: PreparePendingGlobalPlaybackInput
): PreparePendingGlobalPlaybackResult {
  const { pending } = input;

  if (!isAutomaticGlobalPendingReason(pending.reason)) {
    return { action: "execute", req: pending, reResolved: false };
  }

  if (!input.modeGlobal) {
    return { action: "drop", dropReason: "not_global_mode" };
  }

  if (pending.queuedAtGlobalLiveIntentSeq < input.globalLiveIntentSeq) {
    return { action: "drop", dropReason: "intent_superseded" };
  }

  if (pending.queuedAtStartupGeneration !== input.startupGeneration) {
    return { action: "drop", dropReason: "startup_generation_mismatch" };
  }

  if (!input.liveVideoId) {
    return { action: "drop", dropReason: "missing_live_schedule" };
  }

  const pendingIndex = pending.scheduleIndex;
  if (
    pendingIndex == null ||
    pendingIndex !== input.liveScheduleIndex ||
    pending.videoId !== input.liveVideoId
  ) {
    return { action: "drop", dropReason: "live_row_video_mismatch" };
  }

  const staleStart = pending.startSeconds;
  const freshStart = input.liveOffsetSeconds;
  const reResolved = Math.abs(staleStart - freshStart) >= 1;

  return {
    action: "execute",
    reResolved,
    req: {
      reason: pending.reason,
      videoId: input.liveVideoId,
      startSeconds: freshStart,
      scheduleIndex: input.liveScheduleIndex,
    },
  };
}
