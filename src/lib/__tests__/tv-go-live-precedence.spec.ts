import { describe, expect, it } from "vitest";

import {
  bumpStartupGeneration,
  createGoLivePrecedenceHarness,
  enterGlobalModeHarness,
  flushPendingPlaybackHarness,
  queueLocalPlaybackWhileNotReady,
  queueSyncToLiveWhileNotReady,
  runReadinessFlushHarness,
} from "@/lib/tv-go-live-precedence.harness";

describe("Go Live precedence (G9)", () => {
  it("G9 — LOCAL pending → Go Live → readiness flush does not load stale LOCAL", () => {
    const h = createGoLivePrecedenceHarness({ playerReady: false });
    queueLocalPlaybackWhileNotReady(h, "STALE_LOCAL");
    expect(h.pendingPlayback?.reason).toBe("loadLocal");

    enterGlobalModeHarness(h);
    expect(h.globalLiveIntentSeq.current).toBeGreaterThan(0);
    expect(h.pendingLiveSync).toBe(true);

    h.playerReady = true;
    runReadinessFlushHarness(h);

    expect(h.syncToLiveCalls).toBeGreaterThanOrEqual(2);
    expect(h.issuedLoads.some(l => l.videoId === "STALE_LOCAL")).toBe(false);
    expect(h.issuedLoads).toHaveLength(0);
  });

  it("G9-A — LOCAL pending invalidated by Go Live bump", () => {
    const h = createGoLivePrecedenceHarness();
    queueLocalPlaybackWhileNotReady(h, "LOCAL_A");
    const queuedSeq = h.pendingPlayback!.queuedAtGlobalLiveIntentSeq;
    enterGlobalModeHarness(h);
    expect(queuedSeq).toBeLessThan(h.globalLiveIntentSeq.current);
    flushPendingPlaybackHarness(h);
    expect(h.issuedLoads).toHaveLength(0);
  });

  it("G9-B — Go Live while player ready still suppresses stale LOCAL", () => {
    const h = createGoLivePrecedenceHarness({ playerReady: true });
    queueLocalPlaybackWhileNotReady(h, "LOCAL_B");
    enterGlobalModeHarness(h);
    flushPendingPlaybackHarness(h);
    expect(h.issuedLoads.some(l => l.reason === "loadLocal")).toBe(false);
  });

  it("G9-C — Go Live while player not ready keeps GLOBAL pending until readiness", () => {
    const h = createGoLivePrecedenceHarness({ playerReady: false });
    enterGlobalModeHarness(h);
    expect(h.pendingLiveSync).toBe(true);
    flushPendingPlaybackHarness(h);
    expect(h.syncToLiveCalls).toBe(1);
    h.playerReady = true;
    runReadinessFlushHarness(h);
    expect(h.pendingLiveSync).toBe(false);
  });

  it("G9-D — remount generation + readiness does not resurrect stale LOCAL", () => {
    const h = createGoLivePrecedenceHarness({ playerReady: false });
    queueLocalPlaybackWhileNotReady(h, "LOCAL_D");
    enterGlobalModeHarness(h);
    bumpStartupGeneration(h);
    h.playerReady = true;
    runReadinessFlushHarness(h);
    expect(h.issuedLoads.some(l => l.videoId === "LOCAL_D")).toBe(false);
  });

  it("G9-E — repeated Go Live does not resurrect older LOCAL", () => {
    const h = createGoLivePrecedenceHarness();
    queueLocalPlaybackWhileNotReady(h, "LOCAL_E");
    enterGlobalModeHarness(h);
    enterGlobalModeHarness(h);
    flushPendingPlaybackHarness(h);
    expect(h.issuedLoads).toHaveLength(0);
  });

  it("G9-F — syncToLive pending re-resolves after Go Live (fresh live offset)", () => {
    const h = createGoLivePrecedenceHarness();
    enterGlobalModeHarness(h);
    queueSyncToLiveWhileNotReady(h);
    flushPendingPlaybackHarness(h);
    expect(h.issuedLoads).toHaveLength(1);
    expect(h.issuedLoads[0]?.reason).toBe("syncToLive");
    expect(h.issuedLoads[0]?.videoId).toBe("LIVEVID");
    expect(h.issuedLoads[0]?.startSeconds).toBe(150);
  });
});
