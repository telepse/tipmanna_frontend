import { describe, expect, it } from "vitest";

import { shouldSuppressGlobalDriftSeek } from "@/lib/tv-global-drift-seek-guard";
import {
  buildPendingPaymentLocalRestore,
  planPaymentLocalRestoreApply,
  resolvePaymentRestoreMode,
} from "@/lib/tv-payment-restore";
import { shouldSyncToLiveIndexChangeBranch } from "@/lib/tv-sync-index-change";
import {
  countSeeks,
  initSyncedState,
  runHealthyGlobalSyncMirror,
  runSameIndexDriftMirror,
  type PlaybackCommand,
} from "@/lib/tv/tv-global-sync-diagnostic.harness";

describe("shouldSuppressGlobalDriftSeek", () => {
  it("suppresses during BUFFERING/CUED/UNSTARTED and in-flight load", () => {
    expect(
      shouldSuppressGlobalDriftSeek({
        playerState: "BUFFERING",
        inFlightOrchestratedVideoId: null,
      })
    ).toBe(true);
    expect(
      shouldSuppressGlobalDriftSeek({
        playerState: "PLAYING",
        inFlightOrchestratedVideoId: "abc",
      })
    ).toBe(true);
    expect(
      shouldSuppressGlobalDriftSeek({
        playerState: "PLAYING",
        inFlightOrchestratedVideoId: null,
      })
    ).toBe(false);
  });
});

describe("GLOBAL drift loop regression", () => {
  it("does not repeat drift seeks while BUFFERING at 0; seeks once PLAYING with stale time", () => {
    const state = initSyncedState({
      loopOffsetSec: 100,
      player: {
        currentTime: 0,
        playerState: "BUFFERING",
      },
    });
    state.lastSyncedIndex = state.currentIndex;
    state.nowMs = 139_000;

    runHealthyGlobalSyncMirror(state);
    expect(countSeeks(state.commands)).toBe(0);

    state.nowMs = 142_000;
    runHealthyGlobalSyncMirror(state);
    expect(countSeeks(state.commands)).toBe(0);

    state.player.playerState = "PLAYING";
    state.player.currentTime = 0;
    state.nowMs = 145_000;
    runHealthyGlobalSyncMirror(state);
    expect(countSeeks(state.commands)).toBe(1);
  });

  it("runSameIndexDriftMirror respects orchestration suppress", () => {
    const commands: PlaybackCommand[] = [];
    runSameIndexDriftMirror({
      actual: 0,
      target: 39,
      commands,
      player: {
        videoId: "vid-a",
        currentTime: 0,
        ready: true,
        playerState: "CUED",
      },
      orchestrated: { videoId: "vid-a", startSeconds: 0 },
    });
    expect(countSeeks(commands)).toBe(0);

    runSameIndexDriftMirror({
      actual: 0,
      target: 39,
      commands,
      player: {
        videoId: "vid-a",
        currentTime: 0,
        ready: true,
        playerState: "PLAYING",
      },
      orchestrated: { videoId: "vid-a", startSeconds: 0 },
    });
    expect(countSeeks(commands)).toBe(1);
  });
});

describe("resolvePaymentRestoreMode", () => {
  it("GLOBAL-origin successful payment restores GLOBAL despite mode LOCAL", () => {
    expect(
      resolvePaymentRestoreMode({
        mode: "LOCAL",
        originMode: "GLOBAL",
        paymentSucceeded: true,
      })
    ).toBe("GLOBAL");
  });

  it("LOCAL-origin successful payment stays LOCAL", () => {
    expect(
      resolvePaymentRestoreMode({
        mode: "LOCAL",
        originMode: "LOCAL",
        paymentSucceeded: true,
      })
    ).toBe("LOCAL");
  });
});

describe("pending LOCAL payment restore plan", () => {
  const pending = buildPendingPaymentLocalRestore({
    scheduleIndex: 2,
    videoId: "vid-a",
    currentTime: 87,
    wasMuted: false,
    wasPlaying: true,
  });

  it("defers when player not ready", () => {
    expect(
      planPaymentLocalRestoreApply({
        pending,
        playerReady: false,
        orchestratedVideoId: "vid-a",
      })
    ).toBe("defer");
  });

  it("loads when wrong video; seeks when same video ready", () => {
    expect(
      planPaymentLocalRestoreApply({
        pending,
        playerReady: true,
        orchestratedVideoId: null,
      })
    ).toBe("load");
    expect(
      planPaymentLocalRestoreApply({
        pending,
        playerReady: true,
        orchestratedVideoId: "vid-a",
      })
    ).toBe("seek");
  });
});

describe("same-row lastSynced=-1 coalesced seek", () => {
  it("no redundant coalesced seek when index and video already match", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    state.lastSyncedIndex = -1;
    state.player.currentTime = state.orchestrated!.startSeconds;
    const before = countSeeks(state.commands);
    runHealthyGlobalSyncMirror(state);
    expect(countSeeks(state.commands) - before).toBe(0);
    expect(state.lastSyncedIndex).toBe(state.currentIndex);
  });

  it("still coalesced-seeks when offset materially wrong on same row", () => {
    const state = initSyncedState({ loopOffsetSec: 100 });
    state.lastSyncedIndex = -1;
    state.player.currentTime = 0;
    state.player.playerState = "PLAYING";
    const before = countSeeks(state.commands);
    runHealthyGlobalSyncMirror(state);
    expect(countSeeks(state.commands) - before).toBe(1);
  });

  it("index-change branch when genuinely different index", () => {
    expect(
      shouldSyncToLiveIndexChangeBranch({
        scheduleIndex: 1,
        lastSyncedIndex: -1,
        currentIndex: 0,
        sameVideo: false,
      })
    ).toBe(true);
  });
});
