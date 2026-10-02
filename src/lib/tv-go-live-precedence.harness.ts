/**
 * Deterministic orchestration for Go Live vs stale LOCAL pending playback (G9).
 */

import {
  bumpGlobalLiveIntentSeq,
  shouldExecutePendingPlaybackRequest,
  stampPendingPlaybackRequest,
  type PendingPlaybackWithIntent,
} from "@/lib/tv-playback-intent";
import { preparePendingGlobalPlaybackForExecution } from "@/lib/tv-pending-global-playback";
import { decideReadinessFlush } from "@/lib/tv-readiness-flush";
import type { TvPlaybackRequest } from "@/lib/tv-playback-request";

export type GoLivePrecedenceHarness = {
  globalLiveIntentSeq: { current: number };
  pendingPlayback: PendingPlaybackWithIntent | null;
  pendingLiveSync: boolean;
  mode: "GLOBAL" | "LOCAL";
  playerReady: boolean;
  startupGeneration: number;
  lastReadinessFlushGeneration: number | null;
  issuedLoads: TvPlaybackRequest[];
  syncToLiveCalls: number;
  /** Live row/video at flush time (for pending re-resolve tests). */
  liveScheduleIndex: number;
  liveVideoId: string;
  liveOffsetSeconds: number;
};

export function createGoLivePrecedenceHarness(
  overrides?: Partial<Pick<GoLivePrecedenceHarness, "playerReady" | "mode">>
): GoLivePrecedenceHarness {
  return {
    globalLiveIntentSeq: { current: 0 },
    pendingPlayback: null,
    pendingLiveSync: false,
    mode: overrides?.mode ?? "LOCAL",
    playerReady: overrides?.playerReady ?? false,
    startupGeneration: 1,
    lastReadinessFlushGeneration: null,
    issuedLoads: [],
    syncToLiveCalls: 0,
    liveScheduleIndex: 0,
    liveVideoId: "LIVEVID",
    liveOffsetSeconds: 150,
  };
}

export function queueLocalPlaybackWhileNotReady(
  h: GoLivePrecedenceHarness,
  videoId: string
): void {
  h.pendingPlayback = stampPendingPlaybackRequest(
    {
      reason: "loadLocal",
      videoId,
      startSeconds: 0,
      scheduleIndex: 2,
    },
    h.globalLiveIntentSeq.current,
    h.startupGeneration
  );
}

export function enterGlobalModeHarness(h: GoLivePrecedenceHarness): void {
  h.mode = "GLOBAL";
  bumpGlobalLiveIntentSeq(h.globalLiveIntentSeq);
  h.syncToLiveCalls += 1;
  if (!h.playerReady) {
    h.pendingLiveSync = true;
  }
}

export function flushPendingPlaybackHarness(h: GoLivePrecedenceHarness): void {
  const pending = h.pendingPlayback;
  if (!pending) return;
  h.pendingPlayback = null;
  if (
    !shouldExecutePendingPlaybackRequest(pending, h.globalLiveIntentSeq.current)
  ) {
    return;
  }
  if (pending.reason === "syncToLive") {
    const prepared = preparePendingGlobalPlaybackForExecution({
      pending,
      modeGlobal: h.mode === "GLOBAL",
      globalLiveIntentSeq: h.globalLiveIntentSeq.current,
      startupGeneration: h.startupGeneration,
      liveScheduleIndex: h.liveScheduleIndex,
      liveVideoId: h.liveVideoId,
      liveOffsetSeconds: h.liveOffsetSeconds,
    });
    if (prepared.action === "drop") return;
    h.issuedLoads.push(prepared.req);
    return;
  }
  h.issuedLoads.push(pending);
}

export function runReadinessFlushHarness(h: GoLivePrecedenceHarness): void {
  const decision = decideReadinessFlush({
    generation: h.startupGeneration,
    lastFlushedGeneration: h.lastReadinessFlushGeneration,
    pendingLiveSync: h.pendingLiveSync,
    modeGlobal: h.mode === "GLOBAL",
    playerReady: h.playerReady,
  });
  if (!decision.accept) return;
  h.lastReadinessFlushGeneration = h.startupGeneration;
  if (decision.runPendingLive) {
    h.syncToLiveCalls += 1;
    h.pendingLiveSync = false;
  }
  flushPendingPlaybackHarness(h);
}

export function queueSyncToLiveWhileNotReady(h: GoLivePrecedenceHarness): void {
  h.pendingPlayback = stampPendingPlaybackRequest(
    {
      reason: "syncToLive",
      videoId: "LIVEVID",
      startSeconds: 120,
      scheduleIndex: 0,
    },
    h.globalLiveIntentSeq.current,
    h.startupGeneration
  );
}

export function dropAutomaticGlobalPendingHarness(
  h: GoLivePrecedenceHarness
): void {
  if (h.pendingPlayback?.reason === "syncToLive") {
    h.pendingPlayback = null;
  }
}

export function enterLocalModeHarness(h: GoLivePrecedenceHarness): void {
  dropAutomaticGlobalPendingHarness(h);
  h.mode = "LOCAL";
  if (h.pendingLiveSync) {
    h.pendingLiveSync = false;
  }
}

export function bumpStartupGeneration(h: GoLivePrecedenceHarness): void {
  h.startupGeneration += 1;
  h.lastReadinessFlushGeneration = null;
}
