import { describe, expect, it } from "vitest";

import { stampPendingPlaybackRequest } from "@/lib/tv-playback-intent";
import { preparePendingGlobalPlaybackForExecution } from "@/lib/tv-pending-global-playback";
import {
  createGoLivePrecedenceHarness,
  enterGlobalModeHarness,
  enterLocalModeHarness,
  flushPendingPlaybackHarness,
  queueSyncToLiveWhileNotReady,
} from "@/lib/tv-go-live-precedence.harness";
import {
  shouldIssueForwardSameRowDriftSeek,
  shouldSuppressBackwardSameRowDriftWhilePlaying,
} from "@/lib/tv-global-drift-forward-only";

function syncPending(
  overrides: Partial<{
    videoId: string;
    scheduleIndex: number;
    startSeconds: number;
    seq: number;
    generation: number;
  }> = {}
) {
  return stampPendingPlaybackRequest(
    {
      reason: "syncToLive",
      videoId: overrides.videoId ?? "vid-a",
      startSeconds: overrides.startSeconds ?? 40,
      scheduleIndex: overrides.scheduleIndex ?? 4,
    },
    overrides.seq ?? 1,
    overrides.generation ?? 1
  );
}

describe("preparePendingGlobalPlaybackForExecution", () => {
  it("A — re-resolves stale startSeconds for same live row", () => {
    const pending = syncPending({ startSeconds: 40 });
    const prepared = preparePendingGlobalPlaybackForExecution({
      pending,
      modeGlobal: true,
      globalLiveIntentSeq: 1,
      startupGeneration: 1,
      liveScheduleIndex: 4,
      liveVideoId: "vid-a",
      liveOffsetSeconds: 88,
    });
    expect(prepared.action).toBe("execute");
    if (prepared.action === "execute") {
      expect(prepared.reResolved).toBe(true);
      expect(prepared.req.startSeconds).toBe(88);
      expect(prepared.req.videoId).toBe("vid-a");
    }
  });

  it("C — drops pending when live row/video advanced (A → B)", () => {
    const pending = syncPending({ videoId: "vid-a", scheduleIndex: 4 });
    const prepared = preparePendingGlobalPlaybackForExecution({
      pending,
      modeGlobal: true,
      globalLiveIntentSeq: 1,
      startupGeneration: 1,
      liveScheduleIndex: 5,
      liveVideoId: "vid-b",
      liveOffsetSeconds: 12,
    });
    expect(prepared).toEqual({
      action: "drop",
      dropReason: "live_row_video_mismatch",
    });
  });

  it("D — drops when not GLOBAL mode", () => {
    const pending = syncPending();
    const prepared = preparePendingGlobalPlaybackForExecution({
      pending,
      modeGlobal: false,
      globalLiveIntentSeq: 1,
      startupGeneration: 1,
      liveScheduleIndex: 4,
      liveVideoId: "vid-a",
      liveOffsetSeconds: 50,
    });
    expect(prepared.action).toBe("drop");
    if (prepared.action === "drop") {
      expect(prepared.dropReason).toBe("not_global_mode");
    }
  });

  it("drops on startup generation mismatch (remount)", () => {
    const pending = syncPending({ generation: 1 });
    const prepared = preparePendingGlobalPlaybackForExecution({
      pending,
      modeGlobal: true,
      globalLiveIntentSeq: 1,
      startupGeneration: 2,
      liveScheduleIndex: 4,
      liveVideoId: "vid-a",
      liveOffsetSeconds: 50,
    });
    expect(prepared).toEqual({
      action: "drop",
      dropReason: "startup_generation_mismatch",
    });
  });

  it("drops syncToLive pending superseded by Go Live intent bump", () => {
    const pending = syncPending({ seq: 1 });
    const prepared = preparePendingGlobalPlaybackForExecution({
      pending,
      modeGlobal: true,
      globalLiveIntentSeq: 2,
      startupGeneration: 1,
      liveScheduleIndex: 4,
      liveVideoId: "vid-a",
      liveOffsetSeconds: 50,
    });
    expect(prepared).toEqual({
      action: "drop",
      dropReason: "intent_superseded",
    });
  });
});

describe("Go Live / LOCAL harness integration", () => {
  it("D — GLOBAL pending dropped on enter LOCAL", () => {
    const h = createGoLivePrecedenceHarness({ mode: "GLOBAL" });
    queueSyncToLiveWhileNotReady(h);
    enterLocalModeHarness(h);
    expect(h.pendingPlayback).toBeNull();
    flushPendingPlaybackHarness(h);
    expect(h.issuedLoads).toHaveLength(0);
  });

  it("E — LOCAL load not cleared; stale GLOBAL sync dropped before LOCAL", () => {
    const h = createGoLivePrecedenceHarness({ mode: "GLOBAL" });
    queueSyncToLiveWhileNotReady(h);
    enterLocalModeHarness(h);
    h.pendingPlayback = stampPendingPlaybackRequest(
      {
        reason: "loadLocal",
        videoId: "local-vid",
        startSeconds: 0,
        scheduleIndex: 2,
      },
      h.globalLiveIntentSeq.current,
      h.startupGeneration
    );
    flushPendingPlaybackHarness(h);
    expect(h.issuedLoads).toHaveLength(1);
    expect(h.issuedLoads[0]?.reason).toBe("loadLocal");
  });

  it("F — Go Live re-resolves deferred syncToLive (not frozen 120)", () => {
    const h = createGoLivePrecedenceHarness();
    enterGlobalModeHarness(h);
    queueSyncToLiveWhileNotReady(h);
    flushPendingPlaybackHarness(h);
    expect(h.issuedLoads).toHaveLength(1);
    expect(h.issuedLoads[0]?.startSeconds).toBe(150);
    expect(h.issuedLoads[0]?.videoId).toBe("LIVEVID");
  });

  it("F — pending syncToLive before Go Live bump is not replayed", () => {
    const h = createGoLivePrecedenceHarness({ mode: "GLOBAL" });
    h.pendingPlayback = stampPendingPlaybackRequest(
      {
        reason: "syncToLive",
        videoId: "LIVEVID",
        startSeconds: 40,
        scheduleIndex: 0,
      },
      0,
      h.startupGeneration
    );
    enterGlobalModeHarness(h);
    flushPendingPlaybackHarness(h);
    expect(h.issuedLoads).toHaveLength(0);
  });
});

describe("G — unavailable video policy unchanged", () => {
  it("permanent YouTube errors still advance during startup recovery", async () => {
    const { classifyStartupPlayerError } = await import(
      "@/lib/tv-startup-playback-guard"
    );
    const d = classifyStartupPlayerError({
      youtubeErrorCode: 101,
      videoId: null,
      firstPlayReached: false,
      failedVideoIds: new Set(),
      transientRetriedVideoIds: new Set(),
      startupRecoveryCount: 0,
      stablePlaybackReached: false,
      stabilityGuardEnabled: false,
    });
    expect(d.action).toBe("advance_next");
    expect(d.reason).toBe("permanent_content_error");
  });
});

describe("Fix 2 — forward-only same-row drift while PLAYING", () => {
  it("B — suppresses backward drift while PLAYING", () => {
    expect(
      shouldSuppressBackwardSameRowDriftWhilePlaying({
        actual: 110,
        target: 103,
        playerState: "PLAYING",
      })
    ).toBe(true);
  });

  it("B — forward catch-up still allowed", () => {
    expect(
      shouldIssueForwardSameRowDriftSeek({
        actual: 95,
        target: 103,
      })
    ).toBe(true);
  });

  it("allows backward correction when not PLAYING", () => {
    expect(
      shouldSuppressBackwardSameRowDriftWhilePlaying({
        actual: 110,
        target: 103,
        playerState: "BUFFERING",
      })
    ).toBe(false);
  });
});
