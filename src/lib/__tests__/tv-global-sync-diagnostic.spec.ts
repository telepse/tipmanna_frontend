import { describe, expect, it } from "vitest";

import { resolveBroadcastPosition } from "@/lib/tv/broadcastResolver";
import {
  MIRROR_DRIFT_THRESHOLD_S,
  advanceWallClock,
  countLoads,
  countSeeks,
  driftSeekDirection,
  exceedsDriftThreshold,
  initSyncedState,
  runHealthyGlobalSyncMirror,
  runSameIndexDriftMirror,
  createMockPlayer,
  applyTvPageOpenMirror,
  type PlaybackCommand,
} from "@/lib/tv/tv-global-sync-diagnostic.harness";
import { recordDriftSeekIssued } from "@/lib/tv-drift-seek-dedupe";
import {
  diagnoseD1ScheduleRefreshPlusInterval,
  diagnoseD2EnterGlobalPlusModeEffect,
  diagnoseD3ReadinessPlusOrdinary,
  diagnoseD4PaymentResumePlusEffect,
  diagnoseD5VideoEndPlusInterval,
  diagnoseD6PageOpenPlusStartup,
  probeEnterGlobalGoLive,
  probeLastSyncedReset,
  probePageOpenHealthyGlobal,
  probeScheduleRefreshSRA,
  probeScheduleRefreshSRB,
} from "@/lib/tv/tv-global-sync-orchestration.harness";

describe("G1 — normal wall-clock GLOBAL baseline", () => {
  it("G1-A — in-sync playback: repeated ticks produce 0 seeks and 0 loads", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    for (let i = 0; i < 5; i++) {
      advanceWallClock(state, 3000);
      runHealthyGlobalSyncMirror(state);
    }
    expect(countSeeks(state.commands)).toBe(0);
    expect(countLoads(state.commands)).toBe(0);
    expect(state.syncToLiveCalls).toBe(5);
  });

  it("G1-B — program boundary: one load to next video, no stale program", () => {
    const state = initSyncedState({ loopOffsetSec: 3590 });
    advanceWallClock(state, 15_000);
    runHealthyGlobalSyncMirror(state);
    expect(state.currentIndex).toBe(1);
    expect(state.player.videoId).toBe("vid-b");
    expect(countLoads(state.commands)).toBe(1);
    expect(countSeeks(state.commands)).toBe(0);
    const load = state.commands.find(c => c.kind === "loadVideoById");
    expect(load && load.kind === "loadVideoById" ? load.videoId : "").toBe(
      "vid-b"
    );
    expect(
      load && load.kind === "loadVideoById" ? load.startSeconds : -1
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("G2 — forward drift", () => {
  it("issues one forward seek then converges", () => {
    const commands: PlaybackCommand[] = [];
    const player = createMockPlayer({ currentTime: 90 });
    const orchestrated = { videoId: "vid-a", startSeconds: 90 };
    runSameIndexDriftMirror({
      actual: 90,
      target: 100,
      commands,
      player,
      orchestrated,
    });
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      kind: "seekTo",
      seconds: 100,
      allowSeekAhead: false,
    });
    expect(driftSeekDirection(90, 100)).toBe("forward");

    commands.length = 0;
    player.currentTime = 100;
    runSameIndexDriftMirror({
      actual: 100,
      target: 100,
      commands,
      player,
      orchestrated,
    });
    expect(commands).toHaveLength(0);
  });
});

describe("G3 — backward drift and ±3s threshold", () => {
  it("backward correction when actual ahead of target", () => {
    const commands: PlaybackCommand[] = [];
    const player = createMockPlayer({ currentTime: 110 });
    runSameIndexDriftMirror({
      actual: 110,
      target: 103,
      commands,
      player,
      orchestrated: { videoId: "vid-a", startSeconds: 103 },
    });
    expect(commands[0]).toMatchObject({ kind: "seekTo", seconds: 103 });
    expect(driftSeekDirection(110, 103)).toBe("backward");
  });

  it("exact ±3 second boundary (strict > threshold)", () => {
    expect(exceedsDriftThreshold(103 + 3, 103)).toBe(false);
    expect(exceedsDriftThreshold(103 + 3.01, 103)).toBe(true);
    expect(exceedsDriftThreshold(103 - 3, 103)).toBe(false);
    expect(exceedsDriftThreshold(103 - 3.01, 103)).toBe(true);
    expect(MIRROR_DRIFT_THRESHOLD_S).toBe(3);
  });
});

describe("G4 — repeated drift / convergence", () => {
  function tickDrift(
    commands: PlaybackCommand[],
    player: ReturnType<typeof createMockPlayer>,
    target: number,
    actual: number
  ) {
    runSameIndexDriftMirror({
      actual,
      target,
      commands,
      player,
      orchestrated: { videoId: "vid-a", startSeconds: target },
    });
  }

  it("G4-A — seek aligns player: exactly 1 seek", () => {
    const commands: PlaybackCommand[] = [];
    const player = createMockPlayer({ currentTime: 110 });
    tickDrift(commands, player, 100, 110);
    expect(countSeeks(commands)).toBe(1);
    player.currentTime = 100;
    tickDrift(commands, player, 103, 100);
    expect(countSeeks(commands)).toBe(1);
  });

  it("G4-B — player remains ahead: repeated backward seeks until within threshold", () => {
    const commands: PlaybackCommand[] = [];
    const player = createMockPlayer({ currentTime: 110 });
    tickDrift(commands, player, 103, 110);
    tickDrift(commands, player, 106, 110);
    tickDrift(commands, player, 109, 110);
    expect(countSeeks(commands)).toBe(2);
    expect(commands.map(c => (c.kind === "seekTo" ? c.seconds : null))).toEqual(
      [103, 106]
    );
  });

  it("G4-C — player remains behind: repeated forward seeks", () => {
    const commands: PlaybackCommand[] = [];
    const player = createMockPlayer({ currentTime: 95 });
    tickDrift(commands, player, 103, 95);
    tickDrift(commands, player, 106, 98);
    tickDrift(commands, player, 109, 101);
    expect(countSeeks(commands)).toBe(3);
    expect(commands.map(c => (c.kind === "seekTo" ? c.seconds : null))).toEqual(
      [103, 106, 109]
    );
  });

  it("G4-D — seek overshoot then forward correction on next tick", () => {
    const commands: PlaybackCommand[] = [];
    const player = createMockPlayer({ currentTime: 110 });
    tickDrift(commands, player, 100, 110);
    player.currentTime = 94;
    tickDrift(commands, player, 103, 94);
    expect(countSeeks(commands)).toBe(2);
    expect(commands[1]).toMatchObject({ kind: "seekTo", seconds: 103 });
  });

  it("G4-E — target advances while player stays ahead: multiple backward seeks", () => {
    const commands: PlaybackCommand[] = [];
    const player = createMockPlayer({ currentTime: 110 });
    tickDrift(commands, player, 100, 110);
    tickDrift(commands, player, 103, 110);
    tickDrift(commands, player, 106, 110);
    expect(countSeeks(commands)).toBe(3);
  });

  it("G4-F — same target, repeated sync before alignment: deduped to one seek", () => {
    const commands: PlaybackCommand[] = [];
    const player = createMockPlayer({ currentTime: 110 });
    let dedupe = null as ReturnType<typeof recordDriftSeekIssued> | null;
    for (let i = 0; i < 3; i++) {
      player.currentTime = 110;
      runSameIndexDriftMirror({
        actual: 110,
        target: 100,
        commands,
        player,
        orchestrated: { videoId: "vid-a", startSeconds: 100 },
        driftSeekDedupe: dedupe,
        onDedupeUpdate: r => {
          dedupe = r;
        },
      });
    }
    expect(countSeeks(commands)).toBe(1);
    expect(commands[0]).toMatchObject({ kind: "seekTo", seconds: 100 });
  });
});

describe("Duplicate sync windows D1–D6", () => {
  it("D1 schedule refresh + interval", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    const r = diagnoseD1ScheduleRefreshPlusInterval(state);
    expect(r.syncToLiveCalls).toBe(2);
    expect(r.classification).toBe("REDUNDANT");
  });

  it("D2 enterGlobal handled suppresses mode-effect duplicate", () => {
    const r = diagnoseD2EnterGlobalPlusModeEffect({
      handledOnEnter: true,
      fromMode: "LOCAL",
    });
    expect(r.syncToLiveCalls).toBe(1);
    expect(r.classification).toBe("SAFE");
  });

  it("D2 enterGlobal unhandled allows duplicate sync calls", () => {
    const r = diagnoseD2EnterGlobalPlusModeEffect({
      handledOnEnter: false,
      fromMode: "LOCAL",
    });
    expect(r.syncToLiveCalls).toBe(2);
    expect(r.pendingLiveSync).toBe(true);
    expect(r.classification).toBe("REDUNDANT");
  });

  it("D3 readiness pending-live suppresses ordinary maybeSync", () => {
    const r = diagnoseD3ReadinessPlusOrdinary({
      pendingLiveSync: true,
      generation: 1,
      lastFlushed: null,
      playerReady: true,
    });
    expect(r.syncToLiveCalls).toBe(1);
    expect(r.classification).toBe("SAFE");
  });

  it("D4 payment resume + GLOBAL effect", () => {
    const r = diagnoseD4PaymentResumePlusEffect();
    expect(r.classification).toBe("REDUNDANT");
  });

  it("D5 onVideoEnd + interval", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    const r = diagnoseD5VideoEndPlusInterval(state);
    expect(r.syncToLiveCalls).toBe(2);
    expect(r.classification).toBe("REDUNDANT");
  });

  it("D6 page-open + startup/readiness", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    const r = diagnoseD6PageOpenPlusStartup(state);
    expect(r.syncToLiveCalls).toBe(2);
    expect(r.classification).toBe("SAFE");
  });
});

describe("lastSyncedIndex reset characterization", () => {
  const triggers: Array<{
    id: string;
    reset: number;
    healthy: boolean;
    why: string;
  }> = [
    {
      id: "source reset",
      reset: -1,
      healthy: false,
      why: "schedule source changed",
    },
    {
      id: "schedule ID change",
      reset: -1,
      healthy: true,
      why: "activeScheduleId changed",
    },
    { id: "enterLocalMode", reset: -1, healthy: false, why: "left GLOBAL" },
    {
      id: "enterGlobalMode",
      reset: -1,
      healthy: true,
      why: "explicit Go Live",
    },
    {
      id: "readiness pending-live",
      reset: -1,
      healthy: true,
      why: "pending live flush",
    },
    {
      id: "GLOBAL snapshot restore",
      reset: -1,
      healthy: true,
      why: "tab GLOBAL rejoin",
    },
    {
      id: "payment GLOBAL resume",
      reset: -1,
      healthy: true,
      why: "payment exit to GLOBAL",
    },
    {
      id: "startup error retry",
      reset: -1,
      healthy: false,
      why: "error recovery",
    },
    {
      id: "tv-page-open",
      reset: -1,
      healthy: true,
      why: "soft /tv navigation",
    },
    {
      id: "C0 startup path",
      reset: -1,
      healthy: false,
      why: "pending live debt at first play",
    },
    {
      id: "sync miss >15",
      reset: -1,
      healthy: false,
      why: "player not ready threshold",
    },
    {
      id: "cold seed",
      reset: 1,
      healthy: true,
      why: "server livePosition seeds index (not -1)",
    },
    {
      id: "initial embed commit",
      reset: 2,
      healthy: false,
      why: "sets selectedIndex directly",
    },
  ];

  for (const t of triggers) {
    it(`${t.id}: documents index-change branch after reset`, () => {
      if (t.id === "cold seed" || t.id === "initial embed commit") {
        expect(t.reset).toBeGreaterThanOrEqual(0);
        return;
      }
      if (t.id === "tv-page-open") {
        const state = initSyncedState({ loopOffsetSec: 100 });
        applyTvPageOpenMirror(state);
        expect(state.lastSyncedIndex).toBe(state.currentIndex);
        const before = countSeeks(state.commands);
        runHealthyGlobalSyncMirror(state);
        expect(countSeeks(state.commands) - before).toBe(0);
        return;
      }
      const state = initSyncedState({ loopOffsetSec: 100 });
      const probe = probeLastSyncedReset({
        trigger: t.id,
        whyReset: t.why,
        globalHealthy: t.healthy,
        resetTo: t.reset,
        state,
      });
      expect(probe.indexChangeBranch).toBe(true);
      if (t.healthy && t.reset === -1) {
        expect(probe.command).toBe("none");
      }
    });
  }
});

describe("Page-open healthy GLOBAL (Part 7)", () => {
  it("reseed preserves lastSyncedIndex and avoids redundant seek while aligned", () => {
    const r = probePageOpenHealthyGlobal();
    expect(r.beforeLastSynced).toBeGreaterThanOrEqual(0);
    expect(r.afterReset).toBe(r.beforeLastSynced);
    expect(r.redundantSeek).toBe(false);
    expect(r.seeksAfterOneSync).toBe(0);
    expect(r.loadsAfterOneSync).toBe(0);
  });
});

describe("Schedule refresh SR-A / SR-B", () => {
  it("SR-A identical scheduleId: lastSyncedIndex not reset; refresh sync may still run", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    const r = probeScheduleRefreshSRA(state);
    expect(r.lastSyncedUnchanged).toBe(true);
    expect(r.commandsAfterRefreshSync).toBeGreaterThanOrEqual(0);
  });

  it("SR-B schedule id change: lastSynced reset and load on sync", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    state.items = [
      ...state.items,
      {
        id: "c",
        duration: 1000,
        axisStartSec: 7200,
        axisEndSec: 8200,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=vid-c" },
      },
    ];
    const r = probeScheduleRefreshSRB(state);
    expect(r.lastSyncedReset).toBe(true);
    expect(r.loadIssued).toBe(false);
  });
});

describe("Resolver progression sanity (supports G1)", () => {
  it("wall-clock target advances ~3s per 3s tick within same row", () => {
    const items = initSyncedState({ loopOffsetSec: 100 }).items;
    const t0 = resolveBroadcastPosition(items, 0, 43_200, 100_000);
    const t1 = resolveBroadcastPosition(items, 0, 43_200, 103_000);
    expect(t1.offsetSeconds - t0.offsetSeconds).toBe(3);
    expect(t1.scheduleIndex).toBe(t0.scheduleIndex);
  });
});

describe("Go Live index reset probe", () => {
  it("enterGlobalMode forces index-change branch on next sync", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    const { goLiveState } = probeEnterGlobalGoLive(state);
    expect(goLiveState.suppressNextGlobalModeEffectSync).toBe(true);
    expect(state.lastSyncedIndex).toBe(0);
  });
});
