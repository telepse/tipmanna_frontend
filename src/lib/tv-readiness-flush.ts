/**
 * Pure readiness-flush planner — single-shot per startupEmbedGeneration.
 * Does not store stale live offsets; callers recompute via syncToLive().
 */

export type ReadinessFlushDecision = {
  /** False when this generation already flushed, or player not ready yet. */
  accept: boolean;
  /** Run pending-live syncToLive; pending clears only inside handled syncToLive. */
  runPendingLive: boolean;
  /** Run ordinary maybeSyncToLive only if pending live did not run. */
  runOrdinaryMaybeSync: boolean;
};

export function decideReadinessFlush(opts: {
  generation: number;
  lastFlushedGeneration: number | null;
  pendingLiveSync: boolean;
  modeGlobal: boolean;
  playerReady: boolean;
}): ReadinessFlushDecision {
  if (opts.lastFlushedGeneration === opts.generation) {
    return {
      accept: false,
      runPendingLive: false,
      runOrdinaryMaybeSync: false,
    };
  }

  // Do not latch the generation until the command API is ready — early
  // setPlayerVisible(true) from mount must not burn the flush slot.
  if (!opts.playerReady) {
    return {
      accept: false,
      runPendingLive: false,
      runOrdinaryMaybeSync: false,
    };
  }

  if (!opts.modeGlobal) {
    return {
      accept: true,
      runPendingLive: false,
      runOrdinaryMaybeSync: false,
    };
  }

  if (opts.pendingLiveSync) {
    return {
      accept: true,
      runPendingLive: true,
      runOrdinaryMaybeSync: false,
    };
  }

  return {
    accept: true,
    runPendingLive: false,
    runOrdinaryMaybeSync: true,
  };
}

/** Whether an explicit Go Live / live-rejoin may set pendingLiveSync. */
export function shouldCreatePendingLiveSync(opts: {
  playerReady: boolean;
  modeGlobal: boolean;
}): boolean {
  return opts.modeGlobal && !opts.playerReady;
}

/**
 * Creating durable pending live must re-arm the readiness generation latch
 * so a later ready flush can run even if this generation already flushed.
 */
export function shouldRearmReadinessFlushOnPendingCreate(): boolean {
  return true;
}

/** LOCAL / source change cancels durable live intent. */
export function shouldClearPendingLiveSyncOnLocal(): boolean {
  return true;
}

/**
 * Simulate orchestrator side-effect planning for tests:
 * pending live suppresses ordinary maybeSync for the same accepted flush.
 */
export function planReadinessFlushSideEffects(
  decision: ReadinessFlushDecision
): {
  syncToLiveCalls: number;
  maybeSyncCalls: number;
} {
  if (!decision.accept) {
    return { syncToLiveCalls: 0, maybeSyncCalls: 0 };
  }
  if (decision.runPendingLive) {
    return { syncToLiveCalls: 1, maybeSyncCalls: 0 };
  }
  if (decision.runOrdinaryMaybeSync) {
    return { syncToLiveCalls: 0, maybeSyncCalls: 1 };
  }
  return { syncToLiveCalls: 0, maybeSyncCalls: 0 };
}

/**
 * After pending create on an already-flushed generation, the next ready
 * decideReadinessFlush must accept again (re-armed lastFlushed=null).
 */
export function decideAfterPendingCreateRearm(opts: {
  generation: number;
  pendingLiveSync: boolean;
  modeGlobal: boolean;
  playerReady: boolean;
}): ReadinessFlushDecision {
  return decideReadinessFlush({
    generation: opts.generation,
    lastFlushedGeneration: shouldRearmReadinessFlushOnPendingCreate()
      ? null
      : opts.generation,
    pendingLiveSync: opts.pendingLiveSync,
    modeGlobal: opts.modeGlobal,
    playerReady: opts.playerReady,
  });
}
