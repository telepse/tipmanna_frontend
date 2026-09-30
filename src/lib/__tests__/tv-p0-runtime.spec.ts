import { describe, expect, it, vi } from "vitest";

import {
  applyEnterGlobalSyncResult,
  applyPaymentRedirectSessionHold,
  applyReadinessPendingLiveFlush,
  clearOverlayHoldOnly,
  createLooperPlayerVisibleHarness,
  recomputePaymentActive,
} from "@/lib/tv-p0-lifecycle.harness";
import { decideReadinessFlush } from "@/lib/tv-readiness-flush";

describe("P0-A — schedule refresh must not tear down a healthy looper player", () => {
  it("stable setPlayerVisible identity survives schedule-driven callback churn", () => {
    let flushGeneration = 0;
    const runReadinessFlushRef = {
      current: (_trigger: string) => {
        flushGeneration += 1;
      },
    };
    const setPlayerVisibleStable = vi.fn((visible: boolean) => {
      if (visible) {
        queueMicrotask(() => {
          runReadinessFlushRef.current("setPlayerVisible");
        });
      }
    });

    const player = {
      isReady: () => true,
      pauseProgrammatic: vi.fn(),
      mute: vi.fn(),
      getCurrentTime: () => 12,
    };
    const playerRef = { current: player as any };
    const unregisterTvPlayer = vi.fn(() => {
      playerRef.current = null;
    });

    const harness = createLooperPlayerVisibleHarness({
      setPlayerVisible: setPlayerVisibleStable,
      unregisterTvPlayer,
      playerRef,
      writeSnapshot: vi.fn(),
    });

    harness.mountWithDeps(setPlayerVisibleStable);
    runReadinessFlushRef.current = () => {
      flushGeneration += 1;
    };
    harness.mountWithDeps(setPlayerVisibleStable);

    expect(harness.trace.unregister).toBe(0);
    expect(harness.trace.pause).toBe(0);
    expect(harness.trace.mute).toBe(0);
    expect(harness.trace.snapshot).toBe(0);
    expect(playerRef.current).toBe(player);
    expect(unregisterTvPlayer).not.toHaveBeenCalled();
  });

  it("unstable setPlayerVisible identity would unregister (regression sentinel)", () => {
    const setPlayerVisibleV1 = vi.fn();
    const setPlayerVisibleV2 = vi.fn();
    const playerRef = {
      current: {
        isReady: () => true,
        pauseProgrammatic: vi.fn(),
        mute: vi.fn(),
        getCurrentTime: () => 0,
      },
    };
    const unregisterTvPlayer = vi.fn(() => {
      playerRef.current = null as any;
    });
    const harness = createLooperPlayerVisibleHarness({
      setPlayerVisible: setPlayerVisibleV1,
      unregisterTvPlayer,
      playerRef,
    });
    harness.mountWithDeps(setPlayerVisibleV1);
    harness.mountWithDeps(setPlayerVisibleV2);
    expect(harness.trace.unregister).toBe(1);
    expect(playerRef.current).toBeNull();
  });
});

describe("P0-B — Test A pending Go Live + schedule refresh semantics", () => {
  it("enterGlobalMode keeps pending when syncToLive is blocked", () => {
    const after = applyEnterGlobalSyncResult(
      {
        pendingLiveSync: false,
        suppressNextGlobalModeEffectSync: false,
        lastReadinessFlushGeneration: 3,
        startupGeneration: 3,
      },
      {
        handled: false,
        fromMode: "LOCAL",
        shouldRearmReadinessFlushOnPendingCreate: true,
      }
    );
    expect(after.pendingLiveSync).toBe(true);
    expect(after.suppressNextGlobalModeEffectSync).toBe(false);
  });

  it("enterGlobalMode arms suppress only after handled explicit sync", () => {
    const blocked = applyEnterGlobalSyncResult(
      {
        pendingLiveSync: false,
        suppressNextGlobalModeEffectSync: false,
        lastReadinessFlushGeneration: 1,
        startupGeneration: 1,
      },
      {
        handled: false,
        fromMode: "LOCAL",
        shouldRearmReadinessFlushOnPendingCreate: true,
      }
    );
    expect(blocked.suppressNextGlobalModeEffectSync).toBe(false);

    const handled = applyEnterGlobalSyncResult(
      {
        pendingLiveSync: true,
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
    expect(handled.pendingLiveSync).toBe(false);
    expect(handled.suppressNextGlobalModeEffectSync).toBe(true);
  });

  it("readiness flush does not clear pending when syncToLive returns false", () => {
    expect(
      applyReadinessPendingLiveFlush({
        pendingLiveSyncBefore: true,
        syncHandled: false,
      })
    ).toBe(true);
    expect(
      applyReadinessPendingLiveFlush({
        pendingLiveSyncBefore: true,
        syncHandled: true,
      })
    ).toBe(false);
  });

  it("generation latch accepts once even when pending sync is blocked", () => {
    const decision = decideReadinessFlush({
      generation: 5,
      lastFlushedGeneration: null,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: true,
    });
    expect(decision.accept).toBe(true);
    expect(decision.runPendingLive).toBe(true);
  });
});

describe("P0-C — Test B overlay vs session payment holds", () => {
  it("overlay unmount clears overlay hold but session payment still blocks", () => {
    let overlay = true;
    let session = true;
    expect(
      recomputePaymentActive({
        overlayPauseHeld: overlay,
        sessionPauseHeld: session,
      })
    ).toBe(true);
    overlay = false;
    expect(
      recomputePaymentActive({
        overlayPauseHeld: overlay,
        sessionPauseHeld: session,
      })
    ).toBe(true);
    session = false;
    expect(
      recomputePaymentActive({
        overlayPauseHeld: overlay,
        sessionPauseHeld: session,
      })
    ).toBe(false);
  });

  it("overlay-only pause does not imply session hold", () => {
    expect(
      recomputePaymentActive({
        overlayPauseHeld: true,
        sessionPauseHeld: false,
      })
    ).toBe(true);
    expect(
      recomputePaymentActive({
        overlayPauseHeld: false,
        sessionPauseHeld: false,
      })
    ).toBe(false);
  });

  it("redirect arms session hold without overlay; overlay clear leaves session blocking", () => {
    const afterRedirect = applyPaymentRedirectSessionHold({
      overlayPauseHeld: false,
      sessionPauseHeld: false,
      paymentActive: false,
    });
    expect(afterRedirect.sessionPauseHeld).toBe(true);
    expect(afterRedirect.paymentActive).toBe(true);

    const afterOverlayClear = clearOverlayHoldOnly({
      overlayPauseHeld: true,
      sessionPauseHeld: true,
      paymentActive: true,
    });
    expect(afterOverlayClear.overlayPauseHeld).toBe(false);
    expect(afterOverlayClear.sessionPauseHeld).toBe(true);
    expect(afterOverlayClear.paymentActive).toBe(true);
  });
});
