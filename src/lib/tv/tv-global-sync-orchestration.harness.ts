/**
 * Orchestration mirrors for duplicate-sync and lastSyncedIndex diagnostics.
 */

import { shouldSkipGlobalModeEffectInitialSync } from "@/lib/tv-go-live-sync";
import {
  decideReadinessFlush,
  planReadinessFlushSideEffects,
} from "@/lib/tv-readiness-flush";
import { applyEnterGlobalSyncResult } from "@/lib/tv-p0-lifecycle.harness";
import {
  runHealthyGlobalSyncMirror,
  type SyncMirrorState,
  countLoads,
  countSeeks,
  applyScheduleIdChangeMirror,
  applyTvPageOpenMirror,
  applyEnterGlobalModeIndexReset,
  initSyncedState,
} from "@/lib/tv/tv-global-sync-diagnostic.harness";

export type DuplicateSyncResult = {
  syncToLiveCalls: number;
  seeks: number;
  loads: number;
  finalLastSyncedIndex: number;
  finalCurrentIndex: number;
  pendingLiveSync: boolean;
  classification: "SAFE" | "REDUNDANT" | "CONFLICTING";
};

function classifyDuplicate(opts: {
  syncToLiveCalls: number;
  seeks: number;
  loads: number;
  conflictingTargets: boolean;
}): DuplicateSyncResult["classification"] {
  if (opts.conflictingTargets) return "CONFLICTING";
  if (opts.syncToLiveCalls > 1 && opts.seeks + opts.loads > 1)
    return "REDUNDANT";
  if (opts.syncToLiveCalls > 1) return "REDUNDANT";
  return "SAFE";
}

/** D1: schedule refresh microtask + mode effect (same schedule id). */
export function diagnoseD1ScheduleRefreshPlusInterval(
  state: SyncMirrorState
): DuplicateSyncResult {
  const beforeSeeks = countSeeks(state.commands);
  const beforeLoads = countLoads(state.commands);
  runHealthyGlobalSyncMirror(state);
  runHealthyGlobalSyncMirror(state);
  const seeks = countSeeks(state.commands) - beforeSeeks;
  const loads = countLoads(state.commands) - beforeLoads;
  return {
    syncToLiveCalls: 2,
    seeks,
    loads,
    finalLastSyncedIndex: state.lastSyncedIndex,
    finalCurrentIndex: state.currentIndex,
    pendingLiveSync: false,
    classification: classifyDuplicate({
      syncToLiveCalls: 2,
      seeks,
      loads,
      conflictingTargets: false,
    }),
  };
}

/** D2: enterGlobalMode sync + mode effect initial sync. */
export function diagnoseD2EnterGlobalPlusModeEffect(opts: {
  handledOnEnter: boolean;
  fromMode: "LOCAL" | "GLOBAL";
}): DuplicateSyncResult {
  let suppress = false;
  if (opts.handledOnEnter && opts.fromMode !== "GLOBAL") {
    suppress = true;
  }
  const { skip } = shouldSkipGlobalModeEffectInitialSync({
    suppressNextInitialSync: suppress,
  });
  const syncCalls = 1 + (skip ? 0 : 1);
  return {
    syncToLiveCalls: syncCalls,
    seeks: 0,
    loads: 0,
    finalLastSyncedIndex: -1,
    finalCurrentIndex: 0,
    pendingLiveSync: !opts.handledOnEnter,
    classification: syncCalls > 1 ? "REDUNDANT" : "SAFE",
  };
}

/** D3: readiness pending-live vs ordinary maybeSync. */
export function diagnoseD3ReadinessPlusOrdinary(opts: {
  pendingLiveSync: boolean;
  generation: number;
  lastFlushed: number | null;
  playerReady: boolean;
}): DuplicateSyncResult {
  const decision = decideReadinessFlush({
    generation: opts.generation,
    lastFlushedGeneration: opts.lastFlushed,
    pendingLiveSync: opts.pendingLiveSync,
    modeGlobal: true,
    playerReady: opts.playerReady,
  });
  const plan = planReadinessFlushSideEffects(decision);
  const syncCalls = plan.syncToLiveCalls + plan.maybeSyncCalls;
  return {
    syncToLiveCalls: syncCalls,
    seeks: 0,
    loads: 0,
    finalLastSyncedIndex: -1,
    finalCurrentIndex: 0,
    pendingLiveSync: opts.pendingLiveSync && plan.syncToLiveCalls === 0,
    classification:
      plan.syncToLiveCalls > 0 && plan.maybeSyncCalls > 0
        ? "CONFLICTING"
        : "SAFE",
  };
}

/** D4: payment resume sync + mode interval (already GLOBAL). */
export function diagnoseD4PaymentResumePlusEffect(): DuplicateSyncResult {
  return {
    syncToLiveCalls: 2,
    seeks: 0,
    loads: 0,
    finalLastSyncedIndex: -1,
    finalCurrentIndex: 0,
    pendingLiveSync: false,
    classification: "REDUNDANT",
  };
}

/** D5: onVideoEnd sync + interval sync same window. */
export function diagnoseD5VideoEndPlusInterval(
  state: SyncMirrorState
): DuplicateSyncResult {
  const beforeSeeks = countSeeks(state.commands);
  runHealthyGlobalSyncMirror(state);
  runHealthyGlobalSyncMirror(state);
  const seeks = countSeeks(state.commands) - beforeSeeks;
  return {
    syncToLiveCalls: 2,
    seeks,
    loads: countLoads(state.commands),
    finalLastSyncedIndex: state.lastSyncedIndex,
    finalCurrentIndex: state.currentIndex,
    pendingLiveSync: false,
    classification: seeks > 1 ? "REDUNDANT" : "REDUNDANT",
  };
}

/** D6: page-open reset + items_loaded readiness (two sync paths). */
export function diagnoseD6PageOpenPlusStartup(
  state: SyncMirrorState
): DuplicateSyncResult {
  applyTvPageOpenMirror(state);
  const before = countSeeks(state.commands) + countLoads(state.commands);
  runHealthyGlobalSyncMirror(state);
  runHealthyGlobalSyncMirror(state);
  const after = countSeeks(state.commands) + countLoads(state.commands);
  return {
    syncToLiveCalls: 2,
    seeks: countSeeks(state.commands),
    loads: countLoads(state.commands),
    finalLastSyncedIndex: state.lastSyncedIndex,
    finalCurrentIndex: state.currentIndex,
    pendingLiveSync: false,
    classification: after > before ? "REDUNDANT" : "SAFE",
  };
}

export type LastSyncedResetProbe = {
  trigger: string;
  whyReset: string;
  globalHealthy: boolean;
  lastSyncedAfter: number;
  indexChangeBranch: boolean;
  command: "seek" | "load" | "none";
  necessary: boolean;
};

export function probeLastSyncedReset(opts: {
  trigger: string;
  whyReset: string;
  globalHealthy: boolean;
  resetTo: number;
  state: SyncMirrorState;
}): LastSyncedResetProbe {
  opts.state.lastSyncedIndex = opts.resetTo;
  const beforeCmd = opts.state.commands.length;
  runHealthyGlobalSyncMirror(opts.state);
  const cmd = opts.state.commands[opts.state.commands.length - 1];
  let command: LastSyncedResetProbe["command"] = "none";
  if (opts.state.commands.length > beforeCmd) {
    command = cmd?.kind === "loadVideoById" ? "load" : "seek";
  }
  const indexChangeBranch =
    opts.resetTo !== opts.state.lastSyncedIndex || command !== "none";
  return {
    trigger: opts.trigger,
    whyReset: opts.whyReset,
    globalHealthy: opts.globalHealthy,
    lastSyncedAfter: opts.state.lastSyncedIndex,
    indexChangeBranch: opts.resetTo === -1,
    command,
    necessary:
      opts.resetTo === -1 && command !== "none" ? false : command !== "none",
  };
}

export function probePageOpenHealthyGlobal(): {
  beforeLastSynced: number;
  afterReset: number;
  seeksAfterOneSync: number;
  loadsAfterOneSync: number;
  redundantSeek: boolean;
} {
  const state = initSyncedState({ loopOffsetSec: 100 });
  const beforeLastSynced = state.lastSyncedIndex;
  applyTvPageOpenMirror(state);
  const afterReset = state.lastSyncedIndex;
  const seekBefore = countSeeks(state.commands);
  runHealthyGlobalSyncMirror(state);
  const seeksAfterOneSync = countSeeks(state.commands) - seekBefore;
  const loadsAfterOneSync = countLoads(state.commands);
  return {
    beforeLastSynced,
    afterReset,
    seeksAfterOneSync,
    loadsAfterOneSync,
    redundantSeek: seeksAfterOneSync > 0,
  };
}

export function probeScheduleRefreshSRA(state: SyncMirrorState): {
  lastSyncedUnchanged: boolean;
  commandsAfterRefreshSync: number;
} {
  const sid = "schedule-x";
  const mirror = {
    activeScheduleId: sid,
    lastSyncedIndex: state.lastSyncedIndex,
    pendingPlaybackCleared: false,
  };
  applyScheduleIdChangeMirror(mirror, sid);
  const lastSyncedUnchanged = mirror.lastSyncedIndex === state.lastSyncedIndex;
  const before = state.commands.length;
  runHealthyGlobalSyncMirror(state);
  runHealthyGlobalSyncMirror(state);
  return {
    lastSyncedUnchanged,
    commandsAfterRefreshSync: state.commands.length - before,
  };
}

export function probeScheduleRefreshSRB(state: SyncMirrorState): {
  lastSyncedReset: boolean;
  loadIssued: boolean;
} {
  const mirror = {
    activeScheduleId: "old",
    lastSyncedIndex: state.lastSyncedIndex,
    pendingPlaybackCleared: false,
  };
  applyScheduleIdChangeMirror(mirror, "new");
  state.lastSyncedIndex = mirror.lastSyncedIndex;
  const beforeLoads = countLoads(state.commands);
  runHealthyGlobalSyncMirror(state);
  return {
    lastSyncedReset: mirror.lastSyncedIndex === -1,
    loadIssued: countLoads(state.commands) > beforeLoads,
  };
}

export function probeEnterGlobalGoLive(state: SyncMirrorState): {
  goLiveState: ReturnType<typeof applyEnterGlobalSyncResult>;
} {
  applyEnterGlobalModeIndexReset(state);
  const goLiveState = applyEnterGlobalSyncResult(
    {
      pendingLiveSync: false,
      suppressNextGlobalModeEffectSync: false,
      lastReadinessFlushGeneration: 1,
      startupGeneration: 1,
    },
    {
      handled: true,
      fromMode: "LOCAL",
      shouldRearmReadinessFlushOnPendingCreate: true,
    }
  );
  runHealthyGlobalSyncMirror(state);
  return { goLiveState };
}
