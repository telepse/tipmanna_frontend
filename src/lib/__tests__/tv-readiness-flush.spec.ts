import { describe, expect, it } from "vitest";

import {
  decideAfterPendingCreateRearm,
  decideReadinessFlush,
  planReadinessFlushSideEffects,
  shouldClearPendingLiveSyncOnLocal,
  shouldCreatePendingLiveSync,
  shouldRearmReadinessFlushOnPendingCreate,
} from "@/lib/tv-readiness-flush";

describe("decideReadinessFlush", () => {
  it("rejects a second flush for the same generation", () => {
    const first = decideReadinessFlush({
      generation: 2,
      lastFlushedGeneration: null,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: true,
    });
    expect(first.accept).toBe(true);
    expect(first.runPendingLive).toBe(true);
    expect(first.runOrdinaryMaybeSync).toBe(false);
    expect(planReadinessFlushSideEffects(first)).toEqual({
      syncToLiveCalls: 1,
      maybeSyncCalls: 0,
    });

    const second = decideReadinessFlush({
      generation: 2,
      lastFlushedGeneration: 2,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: true,
    });
    expect(second.accept).toBe(false);
    expect(second.runPendingLive).toBe(false);
    expect(second.runOrdinaryMaybeSync).toBe(false);
    expect(planReadinessFlushSideEffects(second)).toEqual({
      syncToLiveCalls: 0,
      maybeSyncCalls: 0,
    });
  });

  it("allows a new generation after remount", () => {
    const next = decideReadinessFlush({
      generation: 3,
      lastFlushedGeneration: 2,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: true,
    });
    expect(next.accept).toBe(true);
    expect(next.runPendingLive).toBe(true);
    expect(next.runOrdinaryMaybeSync).toBe(false);
  });

  it("runs ordinary maybeSync when GLOBAL ready without pending live", () => {
    const d = decideReadinessFlush({
      generation: 1,
      lastFlushedGeneration: null,
      pendingLiveSync: false,
      modeGlobal: true,
      playerReady: true,
    });
    expect(d.accept).toBe(true);
    expect(d.runPendingLive).toBe(false);
    expect(d.runOrdinaryMaybeSync).toBe(true);
    expect(planReadinessFlushSideEffects(d)).toEqual({
      syncToLiveCalls: 0,
      maybeSyncCalls: 1,
    });
  });

  it("does not accept or sync when player is not ready", () => {
    const d = decideReadinessFlush({
      generation: 1,
      lastFlushedGeneration: null,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: false,
    });
    expect(d.accept).toBe(false);
    expect(d.runPendingLive).toBe(false);
    expect(d.runOrdinaryMaybeSync).toBe(false);
  });

  it("accepts LOCAL ready without live sync", () => {
    const d = decideReadinessFlush({
      generation: 1,
      lastFlushedGeneration: null,
      pendingLiveSync: true,
      modeGlobal: false,
      playerReady: true,
    });
    expect(d.accept).toBe(true);
    expect(d.runPendingLive).toBe(false);
    expect(d.runOrdinaryMaybeSync).toBe(false);
  });

  it("Go Live pending then flush yields exactly one syncToLive side effect", () => {
    let lastFlushed: number | null = null;
    const gen = 5;

    const pendingCreate = shouldCreatePendingLiveSync({
      modeGlobal: true,
      playerReady: false,
    });
    expect(pendingCreate).toBe(true);

    const early = decideReadinessFlush({
      generation: gen,
      lastFlushedGeneration: lastFlushed,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: false,
    });
    expect(early.accept).toBe(false);

    const flush = decideReadinessFlush({
      generation: gen,
      lastFlushedGeneration: lastFlushed,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: true,
    });
    expect(flush.accept).toBe(true);
    expect(flush.runPendingLive).toBe(true);
    expect(flush.runOrdinaryMaybeSync).toBe(false);
    lastFlushed = gen;

    const duplicate = decideReadinessFlush({
      generation: gen,
      lastFlushedGeneration: lastFlushed,
      pendingLiveSync: false,
      modeGlobal: true,
      playerReady: true,
    });
    expect(duplicate.accept).toBe(false);

    const effects =
      planReadinessFlushSideEffects(flush).syncToLiveCalls +
      planReadinessFlushSideEffects(duplicate).syncToLiveCalls;
    expect(effects).toBe(1);
  });

  it("re-arm after pending create allows flush on already-flushed generation", () => {
    expect(shouldRearmReadinessFlushOnPendingCreate()).toBe(true);

    const stuck = decideReadinessFlush({
      generation: 4,
      lastFlushedGeneration: 4,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: true,
    });
    expect(stuck.accept).toBe(false);

    const rearmed = decideAfterPendingCreateRearm({
      generation: 4,
      pendingLiveSync: true,
      modeGlobal: true,
      playerReady: true,
    });
    expect(rearmed.accept).toBe(true);
    expect(rearmed.runPendingLive).toBe(true);
    expect(rearmed.runOrdinaryMaybeSync).toBe(false);
    expect(planReadinessFlushSideEffects(rearmed).syncToLiveCalls).toBe(1);
  });
});

describe("shouldCreatePendingLiveSync", () => {
  it("creates only when GLOBAL and player not ready", () => {
    expect(
      shouldCreatePendingLiveSync({ modeGlobal: true, playerReady: false })
    ).toBe(true);
    expect(
      shouldCreatePendingLiveSync({ modeGlobal: true, playerReady: true })
    ).toBe(false);
    expect(
      shouldCreatePendingLiveSync({ modeGlobal: false, playerReady: false })
    ).toBe(false);
  });
});

describe("shouldClearPendingLiveSyncOnLocal", () => {
  it("clears on LOCAL transition", () => {
    expect(shouldClearPendingLiveSyncOnLocal()).toBe(true);
  });
});
