/**
 * Runtime harness for P0 TV lifecycle / Go Live / payment-hold behavior (vitest).
 * Simulates React effect dependency identity without mounting the full provider tree.
 */

export type LooperTeardownTrace = {
  pause: number;
  mute: number;
  snapshot: number;
  setPlayerVisibleFalse: number;
  unregister: number;
};

export function createLooperPlayerVisibleHarness(opts: {
  setPlayerVisible: (visible: boolean) => void;
  unregisterTvPlayer: () => void;
  playerRef: {
    current: {
      isReady?: () => boolean;
      pauseProgrammatic?: () => void;
      mute: () => void;
      getCurrentTime: () => number;
    } | null;
  };
  writeSnapshot?: () => void;
}) {
  const trace: LooperTeardownTrace = {
    pause: 0,
    mute: 0,
    snapshot: 0,
    setPlayerVisibleFalse: 0,
    unregister: 0,
  };

  let mounted = false;
  let lastSetPlayerVisible: typeof opts.setPlayerVisible | null = null;

  const mountWithDeps = (setPlayerVisible: typeof opts.setPlayerVisible) => {
    if (mounted && lastSetPlayerVisible !== setPlayerVisible) {
      runCleanup();
    }
    if (!mounted) {
      opts.setPlayerVisible(true);
      mounted = true;
    }
    lastSetPlayerVisible = setPlayerVisible;
  };

  const runCleanup = () => {
    const player = opts.playerRef.current;
    if (player?.isReady?.()) {
      try {
        player.pauseProgrammatic?.();
        trace.pause += 1;
        player.mute();
        trace.mute += 1;
      } catch {
        /* iframe may be tearing down */
      }
      opts.writeSnapshot?.();
      trace.snapshot += 1;
    }
    opts.setPlayerVisible(false);
    trace.setPlayerVisibleFalse += 1;
    opts.unregisterTvPlayer();
    trace.unregister += 1;
    mounted = false;
  };

  return { trace, mountWithDeps, runCleanup };
}

export type PaymentHoldState = {
  overlayPauseHeld: boolean;
  sessionPauseHeld: boolean;
  paymentActive: boolean;
};

export function recomputePaymentActive(
  holds: Pick<PaymentHoldState, "overlayPauseHeld" | "sessionPauseHeld">
): boolean {
  return holds.overlayPauseHeld || holds.sessionPauseHeld;
}

/** Mirrors redirect snapshot arming session hold without overlay (P0-C). */
export function applyPaymentRedirectSessionHold(
  state: PaymentHoldState
): PaymentHoldState {
  return {
    ...state,
    sessionPauseHeld: true,
    paymentActive: recomputePaymentActive({
      overlayPauseHeld: state.overlayPauseHeld,
      sessionPauseHeld: true,
    }),
  };
}

/** Mirrors clearOverlayPaymentPause: overlay off, session unchanged. */
export function clearOverlayHoldOnly(
  state: PaymentHoldState
): PaymentHoldState {
  const paymentActive = recomputePaymentActive({
    overlayPauseHeld: false,
    sessionPauseHeld: state.sessionPauseHeld,
  });
  return {
    overlayPauseHeld: false,
    sessionPauseHeld: state.sessionPauseHeld,
    paymentActive,
  };
}

export type EnterGlobalGoLiveState = {
  pendingLiveSync: boolean;
  suppressNextGlobalModeEffectSync: boolean;
  lastReadinessFlushGeneration: number | null;
  startupGeneration: number;
};

/** Mirrors enterGlobalMode handled / blocked branches (P0-B). */
export function applyEnterGlobalSyncResult(
  state: EnterGlobalGoLiveState,
  opts: {
    handled: boolean;
    fromMode: "GLOBAL" | "LOCAL";
    shouldRearmReadinessFlushOnPendingCreate: boolean;
  }
): EnterGlobalGoLiveState {
  const next = { ...state };
  if (opts.handled) {
    next.pendingLiveSync = false;
    if (opts.fromMode !== "GLOBAL") {
      next.suppressNextGlobalModeEffectSync = true;
    }
    return next;
  }
  next.pendingLiveSync = true;
  if (
    next.lastReadinessFlushGeneration !== next.startupGeneration &&
    opts.shouldRearmReadinessFlushOnPendingCreate
  ) {
    next.lastReadinessFlushGeneration = null;
  }
  return next;
}

/** Mirrors runReadinessFlush pending-live branch: pending clears only inside syncToLive when handled. */
export function applyReadinessPendingLiveFlush(opts: {
  pendingLiveSyncBefore: boolean;
  syncHandled: boolean;
}): boolean {
  return opts.syncHandled ? false : opts.pendingLiveSyncBefore;
}
