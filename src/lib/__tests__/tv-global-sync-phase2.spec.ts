import { describe, expect, it } from "vitest";

import {
  shouldSuppressIdenticalDriftSeek,
  recordDriftSeekIssued,
  clearDriftSeekDedupe,
  type DriftSeekDedupeRecord,
} from "@/lib/tv-drift-seek-dedupe";
import { resolveTvPageOpenLastSyncedReseed } from "@/lib/tv-page-open-resync";
import {
  applyTvPageOpenMirror,
  advanceWallClock,
  countLoads,
  countSeeks,
  initSyncedState,
  runHealthyGlobalSyncMirror,
  runSameIndexDriftMirror,
  createMockPlayer,
} from "@/lib/tv/tv-global-sync-diagnostic.harness";

describe("Phase 2 — page-open (P2-A–D)", () => {
  it("P2-A — aligned healthy GLOBAL: 0 seek, 0 load", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    applyTvPageOpenMirror(state);
    runHealthyGlobalSyncMirror(state);
    expect(countSeeks(state.commands)).toBe(0);
    expect(countLoads(state.commands)).toBe(0);
  });

  it("P2-B — same row drifted: drift correction on page-open resync", () => {
    const state = initSyncedState({
      loopOffsetSec: 100,
      player: { currentTime: 110 },
    });
    applyTvPageOpenMirror(state);
    runHealthyGlobalSyncMirror(state);
    expect(countSeeks(state.commands)).toBe(1);
    expect(countLoads(state.commands)).toBe(0);
    expect(state.commands[0]).toMatchObject({
      kind: "seekTo",
      seconds: 100,
    });
  });

  it("P2-C — wall clock advanced to next program: load transition", () => {
    const state = initSyncedState({ loopOffsetSec: 3590 });
    advanceWallClock(state, 20_000, { advancePlayer: false });
    applyTvPageOpenMirror(state);
    runHealthyGlobalSyncMirror(state);
    expect(state.currentIndex).toBe(1);
    expect(countLoads(state.commands)).toBe(1);
  });

  it("P2-D — wrong video on player: load correction", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    state.player.videoId = "wrong-vid";
    state.orchestrated = { videoId: "wrong-vid", startSeconds: 100 };
    applyTvPageOpenMirror(state);
    expect(state.lastSyncedIndex).toBe(-1);
    runHealthyGlobalSyncMirror(state);
    expect(countLoads(state.commands)).toBe(1);
    expect(
      state.commands.some(
        c => c.kind === "loadVideoById" && c.videoId === "vid-a"
      )
    ).toBe(true);
  });

  it("resolveTvPageOpenLastSyncedReseed returns null when video mismatches", () => {
    expect(
      resolveTvPageOpenLastSyncedReseed({
        modeGlobal: true,
        playerReady: true,
        broadcastEpoch: 0,
        itemsLength: 2,
        totalDuration: 43_200,
        liveScheduleIndex: 0,
        liveVideoId: "vid-a",
        currentIndex: 0,
        orchestratedVideoId: "wrong",
      })
    ).toBeNull();
  });
});

describe("Phase 2 — drift dedupe (P2-E–I)", () => {
  it("P2-E — triple sync same target: exactly one seek", () => {
    const commands: Parameters<typeof runSameIndexDriftMirror>[0]["commands"] =
      [];
    const player = createMockPlayer({ currentTime: 110 });
    let dedupe: DriftSeekDedupeRecord | null = clearDriftSeekDedupe();
    for (let i = 0; i < 3; i++) {
      player.currentTime = 110;
      runSameIndexDriftMirror({
        actual: 110,
        target: 100,
        commands,
        player,
        orchestrated: { videoId: "vid-a", startSeconds: 90 },
        driftSeekDedupe: dedupe,
        onDedupeUpdate: r => {
          dedupe = r;
        },
      });
    }
    expect(countSeeks(commands)).toBe(1);
  });

  it("P2-F — advancing targets: three legitimate seeks", () => {
    const commands: Parameters<typeof runSameIndexDriftMirror>[0]["commands"] =
      [];
    const player = createMockPlayer({ currentTime: 110 });
    let dedupe: DriftSeekDedupeRecord | null = clearDriftSeekDedupe();
    for (const target of [100, 103, 106]) {
      player.currentTime = 110;
      runSameIndexDriftMirror({
        actual: 110,
        target,
        commands,
        player,
        orchestrated: { videoId: "vid-a", startSeconds: 0 },
        driftSeekDedupe: dedupe,
        onDedupeUpdate: r => {
          dedupe = r;
        },
      });
    }
    expect(countSeeks(commands)).toBe(3);
  });

  it("P2-G — aligned after seek: no second seek", () => {
    const commands: Parameters<typeof runSameIndexDriftMirror>[0]["commands"] =
      [];
    const player = createMockPlayer({ currentTime: 110 });
    let dedupe: DriftSeekDedupeRecord | null = clearDriftSeekDedupe();
    runSameIndexDriftMirror({
      actual: 110,
      target: 100,
      commands,
      player,
      orchestrated: { videoId: "vid-a", startSeconds: 90 },
      driftSeekDedupe: dedupe,
      onDedupeUpdate: r => {
        dedupe = r;
      },
    });
    player.currentTime = 100;
    runSameIndexDriftMirror({
      actual: 100,
      target: 103,
      commands,
      player,
      orchestrated: { videoId: "vid-a", startSeconds: 100 },
      driftSeekDedupe: dedupe,
      onDedupeUpdate: r => {
        dedupe = r;
      },
    });
    expect(countSeeks(commands)).toBe(1);
  });

  it("P2-H — new target after player movement still seeks", () => {
    expect(
      shouldSuppressIdenticalDriftSeek({
        record: recordDriftSeekIssued({
          startupGeneration: 1,
          scheduleIndex: 0,
          videoId: "vid-a",
          targetSeconds: 100,
          actual: 110,
        }),
        startupGeneration: 1,
        scheduleIndex: 0,
        videoId: "vid-a",
        targetSeconds: 103,
        actual: 108,
      })
    ).toBe(false);
  });

  it("P2-I — startup generation bump allows seek again", () => {
    const record = recordDriftSeekIssued({
      startupGeneration: 1,
      scheduleIndex: 0,
      videoId: "vid-a",
      targetSeconds: 100,
      actual: 110,
    });
    expect(
      shouldSuppressIdenticalDriftSeek({
        record,
        startupGeneration: 2,
        scheduleIndex: 0,
        videoId: "vid-a",
        targetSeconds: 100,
        actual: 110,
      })
    ).toBe(false);
  });
});
