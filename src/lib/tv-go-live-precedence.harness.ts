/**
 * Deterministic orchestration for Go Live vs stale LOCAL pending playback (G9).
 */

import {
  bumpGlobalLiveIntentSeq,
  shouldExecutePendingPlaybackRequest,
  stampPendingPlaybackRequest,
  type PendingPlaybackWithIntent,
} from "@/lib/tv-playback-intent";
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
    h.globalLiveIntentSeq.current
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
    h.globalLiveIntentSeq.current
  );
}

export function bumpStartupGeneration(h: GoLivePrecedenceHarness): void {
  h.startupGeneration += 1;
  h.lastReadinessFlushGeneration = null;
}
