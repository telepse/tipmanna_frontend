/**
 * Deterministic mirror of healthy GLOBAL syncToLive drift/index branches
 * (tv-provider.tsx DRIFT_THRESHOLD_S=3, same-index + index-change paths).
 * Diagnostic only — not imported by production.
 */

import {
  resolveBroadcastPosition,
  type ScheduleItem,
} from "@/lib/tv/broadcastResolver";
import {
  clearDriftSeekDedupe,
  recordDriftSeekIssued,
  shouldSuppressIdenticalDriftSeek,
  type DriftSeekDedupeRecord,
} from "@/lib/tv-drift-seek-dedupe";
import { shouldSuppressGlobalDriftSeek } from "@/lib/tv-global-drift-seek-guard";
import { resolveTvPageOpenLastSyncedReseed } from "@/lib/tv-page-open-resync";
import { shouldSyncToLiveIndexChangeBranch } from "@/lib/tv-sync-index-change";

/** Must match tv-provider.tsx */
export const MIRROR_DRIFT_THRESHOLD_S = 3;
export const MIRROR_SYNC_INTERVAL_MS = 3_000;

export type PlaybackCommand =
  | { kind: "seekTo"; seconds: number; allowSeekAhead: boolean }
  | {
      kind: "loadVideoById";
      videoId: string;
      startSeconds: number;
      reason: "syncToLive";
    };

export type MockPlayer = {
  videoId: string;
  currentTime: number;
  ready: boolean;
  playerState: string;
};

export type SyncMirrorState = {
  mode: "GLOBAL" | "LOCAL";
  paymentActive: boolean;
  lastSyncedIndex: number;
  currentIndex: number;
  orchestrated: { videoId: string; startSeconds: number } | null;
  items: ScheduleItem[];
  broadcastEpoch: number;
  totalDuration: number;
  nowMs: number;
  player: MockPlayer;
  commands: PlaybackCommand[];
  syncToLiveCalls: number;
  startupGeneration: number;
  driftSeekDedupe: DriftSeekDedupeRecord | null;
  inFlightOrchestratedVideoId: string | null;
};

export function createMockPlayer(overrides?: Partial<MockPlayer>): MockPlayer {
  return {
    videoId: "vid-a",
    currentTime: 0,
    ready: true,
    playerState: "PLAYING",
    ...overrides,
  };
}

export function extractVid(url: string): string {
  const m = url.match(/v=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? url;
}

/** Mirrors `Math.abs(actual - target) > DRIFT_THRESHOLD_S` (strict). */
export function exceedsDriftThreshold(actual: number, target: number): boolean {
  return Math.abs(actual - target) > MIRROR_DRIFT_THRESHOLD_S;
}

export function driftSeekDirection(
  actual: number,
  target: number
): "forward" | "backward" | "none" {
  if (!exceedsDriftThreshold(actual, target)) return "none";
  return actual < target ? "forward" : "backward";
}

/**
 * One healthy GLOBAL syncToLive tick (startup guards off, firstPlayReached,
 * no notice segments, payment inactive).
 */
export function runHealthyGlobalSyncMirror(state: SyncMirrorState): {
  handled: boolean;
} {
  state.syncToLiveCalls += 1;
  if (state.mode !== "GLOBAL" || state.paymentActive) return { handled: false };
  if (!state.player.ready || !state.items.length) return { handled: false };

  const pos = resolveBroadcastPosition(
    state.items,
    state.broadcastEpoch,
    state.totalDuration,
    state.nowMs
  );
  if (!pos.item?.channel?.url) return { handled: false };

  const videoId = extractVid(pos.item.channel.url);
  const target = pos.offsetSeconds;
  const scheduleIndex = pos.scheduleIndex;

  let syncIndexChangeBranch = false;
  if (scheduleIndex !== state.lastSyncedIndex) {
    const sameVideoForBranch =
      state.orchestrated?.videoId === videoId && state.player.ready;
    syncIndexChangeBranch = shouldSyncToLiveIndexChangeBranch({
      scheduleIndex,
      lastSyncedIndex: state.lastSyncedIndex,
      currentIndex: state.currentIndex,
      sameVideo: sameVideoForBranch,
    });
  }

  if (scheduleIndex !== state.lastSyncedIndex && syncIndexChangeBranch) {
    state.driftSeekDedupe = clearDriftSeekDedupe();
    state.lastSyncedIndex = scheduleIndex;
    state.currentIndex = scheduleIndex;
    const sameVideo =
      state.orchestrated?.videoId === videoId && state.player.ready;
    if (sameVideo) {
      state.commands.push({
        kind: "seekTo",
        seconds: target,
        allowSeekAhead: false,
      });
      state.player.currentTime = target;
      state.orchestrated = { videoId, startSeconds: target };
    } else {
      state.commands.push({
        kind: "loadVideoById",
        videoId,
        startSeconds: target,
        reason: "syncToLive",
      });
      state.player.videoId = videoId;
      state.player.currentTime = target;
      state.orchestrated = { videoId, startSeconds: target };
    }
    return { handled: true };
  }

  if (scheduleIndex !== state.lastSyncedIndex && !syncIndexChangeBranch) {
    state.lastSyncedIndex = scheduleIndex;
  }

  const orchestrated = state.orchestrated;
  if (videoId && (!orchestrated || orchestrated.videoId !== videoId)) {
    state.commands.push({
      kind: "loadVideoById",
      videoId,
      startSeconds: target,
      reason: "syncToLive",
    });
    state.player.videoId = videoId;
    state.player.currentTime = target;
    state.orchestrated = { videoId, startSeconds: target };
    return { handled: true };
  }

  if (scheduleIndex !== state.lastSyncedIndex) {
    return { handled: true };
  }

  const actual = state.player.currentTime;
  if (exceedsDriftThreshold(actual, target)) {
    if (
      shouldSuppressGlobalDriftSeek({
        playerState: state.player.playerState,
        inFlightOrchestratedVideoId: state.inFlightOrchestratedVideoId,
      })
    ) {
      return { handled: true };
    }
    if (
      !shouldSuppressIdenticalDriftSeek({
        record: state.driftSeekDedupe,
        startupGeneration: state.startupGeneration,
        scheduleIndex,
        videoId,
        targetSeconds: target,
        actual,
      })
    ) {
      state.commands.push({
        kind: "seekTo",
        seconds: target,
        allowSeekAhead: false,
      });
      state.player.currentTime = target;
      if (state.orchestrated) {
        state.orchestrated = { ...state.orchestrated, startSeconds: target };
      }
      state.driftSeekDedupe = recordDriftSeekIssued({
        startupGeneration: state.startupGeneration,
        scheduleIndex,
        videoId,
        targetSeconds: target,
        actual,
      });
    }
  }
  return { handled: true };
}

export function countSeeks(commands: PlaybackCommand[]): number {
  return commands.filter(c => c.kind === "seekTo").length;
}

export function countLoads(commands: PlaybackCommand[]): number {
  return commands.filter(c => c.kind === "loadVideoById").length;
}

/** Advance fake clock; optionally advance player time with wall clock (1:1). */
export function advanceWallClock(
  state: SyncMirrorState,
  deltaMs: number,
  opts?: { advancePlayer: boolean }
): void {
  state.nowMs += deltaMs;
  if (opts?.advancePlayer !== false) {
    state.player.currentTime += deltaMs / 1000;
  }
}

export function twoProgramSchedule(): ScheduleItem[] {
  return [
    {
      id: "a",
      duration: 3600,
      axisStartSec: 0,
      axisEndSec: 3600,
      seekBaseSeconds: 0,
      channel: { url: "https://youtube.com/watch?v=vid-a" },
    },
    {
      id: "b",
      duration: 3600,
      axisStartSec: 3600,
      axisEndSec: 7200,
      seekBaseSeconds: 0,
      channel: { url: "https://youtube.com/watch?v=vid-b" },
    },
  ];
}

export function initSyncedState(opts: {
  loopOffsetSec: number;
  player?: Partial<MockPlayer>;
}): SyncMirrorState {
  const items = twoProgramSchedule();
  const epoch = 0;
  const nowMs = opts.loopOffsetSec * 1000;
  const pos = resolveBroadcastPosition(items, epoch, 43_200, nowMs);
  const videoId = extractVid(pos.item!.channel.url);
  return {
    mode: "GLOBAL",
    paymentActive: false,
    lastSyncedIndex: pos.scheduleIndex,
    currentIndex: pos.scheduleIndex,
    orchestrated: { videoId, startSeconds: pos.offsetSeconds },
    items,
    broadcastEpoch: epoch,
    totalDuration: 43_200,
    nowMs,
    player: createMockPlayer({
      videoId,
      currentTime: pos.offsetSeconds,
      ...opts.player,
    }),
    commands: [],
    syncToLiveCalls: 0,
    startupGeneration: 1,
    driftSeekDedupe: null,
    inFlightOrchestratedVideoId: null,
  };
}

/** Direct drift tick (same index, same video) for G2–G4 controlled scenarios. */
export function runSameIndexDriftMirror(opts: {
  actual: number;
  target: number;
  commands: PlaybackCommand[];
  player: MockPlayer;
  orchestrated: { videoId: string; startSeconds: number };
  startupGeneration?: number;
  scheduleIndex?: number;
  videoId?: string;
  driftSeekDedupe?: DriftSeekDedupeRecord | null;
  inFlightOrchestratedVideoId?: string | null;
  onDedupeUpdate?: (r: DriftSeekDedupeRecord | null) => void;
}): void {
  const { actual, target, commands, player, orchestrated } = opts;
  const startupGeneration = opts.startupGeneration ?? 1;
  const scheduleIndex = opts.scheduleIndex ?? 0;
  const videoId = opts.videoId ?? player.videoId;
  let dedupe = opts.driftSeekDedupe ?? null;
  player.currentTime = actual;
  if (exceedsDriftThreshold(actual, target)) {
    if (
      shouldSuppressGlobalDriftSeek({
        playerState: player.playerState,
        inFlightOrchestratedVideoId: opts.inFlightOrchestratedVideoId ?? null,
      })
    ) {
      return;
    }
    if (
      !shouldSuppressIdenticalDriftSeek({
        record: dedupe,
        startupGeneration,
        scheduleIndex,
        videoId,
        targetSeconds: target,
        actual,
      })
    ) {
      commands.push({
        kind: "seekTo",
        seconds: target,
        allowSeekAhead: false,
      });
      player.currentTime = target;
      orchestrated.startSeconds = target;
      dedupe = recordDriftSeekIssued({
        startupGeneration,
        scheduleIndex,
        videoId,
        targetSeconds: target,
        actual,
      });
      opts.onDedupeUpdate?.(dedupe);
    }
  }
}

export type ScheduleApplyMirror = {
  activeScheduleId: string | null;
  lastSyncedIndex: number;
  pendingPlaybackCleared: boolean;
};

/** Mirrors applySchedulePayloadCore schedule-id branch only. */
export function applyScheduleIdChangeMirror(
  state: ScheduleApplyMirror,
  nextScheduleId: string
): void {
  if (state.activeScheduleId !== nextScheduleId) {
    state.lastSyncedIndex = -1;
    state.activeScheduleId = nextScheduleId;
    state.pendingPlaybackCleared = true;
  }
}

/** Mirrors tv-page-open handler (Phase 2 reseed). */
export function applyTvPageOpenMirror(state: SyncMirrorState): void {
  const pos = resolveBroadcastPosition(
    state.items,
    state.broadcastEpoch,
    state.totalDuration,
    state.nowMs
  );
  const liveVideoId = pos.item?.channel?.url
    ? extractVid(pos.item.channel.url)
    : null;
  const reseed = resolveTvPageOpenLastSyncedReseed({
    modeGlobal: state.mode === "GLOBAL",
    playerReady: state.player.ready,
    broadcastEpoch: state.broadcastEpoch,
    itemsLength: state.items.length,
    totalDuration: state.totalDuration,
    liveScheduleIndex: pos.scheduleIndex,
    liveVideoId,
    currentIndex: state.currentIndex,
    orchestratedVideoId: state.orchestrated?.videoId ?? null,
  });
  state.lastSyncedIndex = reseed ?? -1;
}

/** Mirrors enterGlobalMode lastSynced reset (not bump). */
export function applyEnterGlobalModeIndexReset(state: {
  lastSyncedIndex: number;
}): void {
  state.lastSyncedIndex = -1;
}

export function simulateDuplicateSyncWindow(opts: {
  syncCalls: Array<() => void>;
}): { syncToLiveCalls: number } {
  let n = 0;
  for (const call of opts.syncCalls) {
    call();
    n += 1;
  }
  return { syncToLiveCalls: n };
}
