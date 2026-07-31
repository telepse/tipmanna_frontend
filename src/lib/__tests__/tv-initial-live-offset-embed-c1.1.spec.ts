import { describe, expect, it } from "vitest";

import {
  canRecordInitialEmbedSuccess,
  canRecordInitialEmbedSuccessGeneration,
  computeExpectedCommittedOffsetSeconds,
  evaluateInitialEmbedSuccess,
  isSyncBasedInitialEmbedSuccessTrigger,
  type CommittedInitialEmbed,
  type InitialEmbedSuccessEvaluationInput,
} from "../tv-initial-live-offset-embed";

const baseCommitted = (): CommittedInitialEmbed => ({
  videoId: "vidA",
  startOffsetSeconds: 100,
  selectedIndex: 2,
  startupGeneration: 1,
  committedAtPerformanceMs: 1000,
  source: "global",
  sourceCommunityId: null,
});

const baseInput = (
  overrides: Partial<InitialEmbedSuccessEvaluationInput> = {}
): InitialEmbedSuccessEvaluationInput => ({
  committedTarget: baseCommitted(),
  activeStartupGeneration: 1,
  currentSource: "global",
  currentCommunityId: null,
  currentVideoId: "vidA",
  currentScheduleIndex: 2,
  currentLiveOffsetSeconds: 104,
  nowPerformanceMs: 5000,
  replacementLoadIssued: false,
  prePlaySeekExecuted: false,
  initialTargetMarkedStale: false,
  c1Enabled: true,
  ...overrides,
});

describe("computeExpectedCommittedOffsetSeconds", () => {
  it("advances offset by elapsed seconds since commit", () => {
    expect(
      computeExpectedCommittedOffsetSeconds(baseCommitted(), 5000)
    ).toBe(104);
  });
});

describe("evaluateInitialEmbedSuccess", () => {
  it("confirms when live offset matches elapsed-adjusted committed target", () => {
    const result = evaluateInitialEmbedSuccess(baseInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.expectedOffsetSeconds).toBe(104);
      expect(result.driftSeconds).toBeLessThanOrEqual(3);
    }
  });

  it("rejects beyond-tolerance offset drift", () => {
    const result = evaluateInitialEmbedSuccess(
      baseInput({ currentLiveOffsetSeconds: 120 })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("offset_mismatch");
  });

  it("rejects video mismatch", () => {
    const result = evaluateInitialEmbedSuccess(
      baseInput({ currentVideoId: "vidB" })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("video_mismatch");
  });

  it("rejects stale generation", () => {
    const result = evaluateInitialEmbedSuccess(
      baseInput({ activeStartupGeneration: 2 })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("stale_generation");
  });

  it("rejects replacement load before confirmation", () => {
    const result = evaluateInitialEmbedSuccess(
      baseInput({ replacementLoadIssued: true })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("replacement_load_issued");
    }
  });

  it("rejects pre-play executed seek", () => {
    const result = evaluateInitialEmbedSuccess(
      baseInput({ prePlaySeekExecuted: true })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("pre_play_seek_executed");
  });

  it("rejects stale initial target marker", () => {
    const result = evaluateInitialEmbedSuccess(
      baseInput({ initialTargetMarkedStale: true })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("initial_target_stale");
  });

  it("rejects community mismatch", () => {
    const committed = baseCommitted();
    committed.source = "community";
    committed.sourceCommunityId = "c1";
    const result = evaluateInitialEmbedSuccess(
      baseInput({
        committedTarget: committed,
        currentSource: "community",
        currentCommunityId: "c2",
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("community_mismatch");
  });

  it("rejects when c1 disabled", () => {
    const result = evaluateInitialEmbedSuccess(baseInput({ c1Enabled: false }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("c1_disabled");
  });
});

describe("canRecordInitialEmbedSuccess", () => {
  it("allows first record for generation", () => {
    expect(canRecordInitialEmbedSuccess(null, 1, 1)).toBe(true);
  });

  it("blocks duplicate record for same generation", () => {
    expect(canRecordInitialEmbedSuccess(1, 1, 1)).toBe(false);
  });

  it("blocks stale committed generation", () => {
    expect(canRecordInitialEmbedSuccess(null, 2, 1)).toBe(false);
  });
});

describe("canRecordInitialEmbedSuccessGeneration", () => {
  it("detects already recorded generation", () => {
    expect(canRecordInitialEmbedSuccessGeneration(1, 1)).toBe(false);
    expect(canRecordInitialEmbedSuccessGeneration(1, 2)).toBe(true);
  });
});

describe("isSyncBasedInitialEmbedSuccessTrigger", () => {
  it("identifies sync routes", () => {
    expect(isSyncBasedInitialEmbedSuccessTrigger("first_sync_same_index")).toBe(
      true
    );
    expect(
      isSyncBasedInitialEmbedSuccessTrigger("first_sync_request_playback")
    ).toBe(true);
    expect(isSyncBasedInitialEmbedSuccessTrigger("first_playing_fallback")).toBe(
      false
    );
  });
});

describe("C1.1 route semantics (pure evaluation)", () => {
  it("first_sync_request_playback path: match at O + elapsed", () => {
    const committed = baseCommitted();
    committed.startOffsetSeconds = 2347;
    committed.committedAtPerformanceMs = 10_000;
    const result = evaluateInitialEmbedSuccess(
      baseInput({
        committedTarget: committed,
        currentLiveOffsetSeconds: 2350,
        nowPerformanceMs: 13_000,
      })
    );
    expect(result.success).toBe(true);
  });

  it("first_playing_fallback: confirmed without requiring sync trigger flag", () => {
    const result = evaluateInitialEmbedSuccess(baseInput());
    expect(result.success).toBe(true);
  });

  it("suppressed seek does not block when prePlaySeekExecuted is false", () => {
    const result = evaluateInitialEmbedSuccess(
      baseInput({ prePlaySeekExecuted: false })
    );
    expect(result.success).toBe(true);
  });
});
