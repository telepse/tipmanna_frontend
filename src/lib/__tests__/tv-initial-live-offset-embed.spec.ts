import { describe, expect, it } from "vitest";

import {
  buildProvisionalInitialTarget,
  clampOffsetToItem,
  computeInitialEmbedPosition,
  isInitialTargetStillValid,
  isStaleStartupGeneration,
  matchesCommittedInitialEmbed,
  normalizeEmbedStartSeconds,
  shouldSkipInitialReload,
} from "../tv-initial-live-offset-embed";

const extractId = (url: string) => {
  const m = url.match(/v=([^&]+)/);
  return m ? m[1]! : null;
};

describe("normalizeEmbedStartSeconds", () => {
  it("floors positive values", () => {
    expect(normalizeEmbedStartSeconds(12.9)).toBe(12);
  });

  it("returns 0 for invalid", () => {
    expect(normalizeEmbedStartSeconds(-1)).toBe(0);
  });
});

describe("clampOffsetToItem", () => {
  it("respects seek base and duration", () => {
    expect(
      clampOffsetToItem(500, { duration: 120, seekBaseSeconds: 10 })
    ).toBe(129);
  });
});

describe("computeInitialEmbedPosition", () => {
  const items = [
    {
      duration: 600,
      seekBaseSeconds: 0,
      channel: { url: "https://youtube.com/watch?v=vid1" },
    },
    {
      duration: 600,
      seekBaseSeconds: 5,
      channel: { url: "https://youtube.com/watch?v=vid2" },
    },
  ];

  it("adjusts offset for elapsed time on same index", () => {
    const result = computeInitialEmbedPosition({
      t6Index: 0,
      t6OffsetSeconds: 100,
      t6ResolvedAtPerformanceMs: 1000,
      items,
      broadcastEpoch: 0,
      totalDuration: 1200,
      nowMs: 2000,
      performanceNowMs: 2500,
      extractVideoId: extractId,
      resolvePosition: () => ({ scheduleIndex: 0, offsetSeconds: 100 }),
    });
    expect(result?.videoId).toBe("vid1");
    expect(result?.startOffsetSeconds).toBe(101);
  });

  it("uses fresh position when index rolled over", () => {
    const result = computeInitialEmbedPosition({
      t6Index: 0,
      t6OffsetSeconds: 100,
      t6ResolvedAtPerformanceMs: 1000,
      items,
      broadcastEpoch: 0,
      totalDuration: 1200,
      nowMs: 700,
      performanceNowMs: 1500,
      extractVideoId: extractId,
      resolvePosition: () => ({ scheduleIndex: 1, offsetSeconds: 42 }),
    });
    expect(result?.selectedIndex).toBe(1);
    expect(result?.rolledOver).toBe(true);
    expect(result?.videoId).toBe("vid2");
  });
});

describe("shouldSkipInitialReload", () => {
  const committed = {
    videoId: "abc",
    startOffsetSeconds: 100,
    selectedIndex: 0,
    startupGeneration: 1,
    committedAtPerformanceMs: 1000,
  };

  it("skips redundant syncToLive within tolerance", () => {
    expect(
      shouldSkipInitialReload(
        committed,
        { videoId: "abc", startSeconds: 101, reason: "syncToLive" },
        false,
        1500,
        true
      )
    ).toBe(true);
  });

  it("does not skip when video changed", () => {
    expect(
      shouldSkipInitialReload(
        committed,
        { videoId: "other", startSeconds: 100, reason: "syncToLive" },
        false,
        1500,
        true
      )
    ).toBe(false);
  });

  it("does not skip after first play", () => {
    expect(
      shouldSkipInitialReload(
        committed,
        { videoId: "abc", startSeconds: 101, reason: "syncToLive" },
        true,
        1500,
        true
      )
    ).toBe(false);
  });

  it("preserves legacy when flag off", () => {
    expect(
      shouldSkipInitialReload(
        committed,
        { videoId: "abc", startSeconds: 101, reason: "syncToLive" },
        false,
        1500,
        false
      )
    ).toBe(false);
  });
});

describe("stale generation and target validity", () => {
  it("rejects stale startup generation", () => {
    expect(isStaleStartupGeneration(1, 2)).toBe(true);
  });

  it("validates provisional target at confirm time", () => {
    const provisional = buildProvisionalInitialTarget({
      startupGeneration: 1,
      source: "global",
      sourceCommunityId: null,
      scheduleRevision: "r1",
      selectedIndex: 0,
      videoId: "vid1",
      startOffsetSeconds: 50,
      resolvedAtPerformanceMs: 100,
    });
    const committed = {
      videoId: "vid1",
      startOffsetSeconds: 52,
      selectedIndex: 0,
      startupGeneration: 1,
      committedAtPerformanceMs: 200,
    };
    expect(isInitialTargetStillValid(provisional, committed, 1)).toBe(true);
  });
});

describe("matchesCommittedInitialEmbed", () => {
  it("accounts for elapsed time since commit", () => {
    const committed = {
      videoId: "v1",
      startOffsetSeconds: 10,
      selectedIndex: 0,
      startupGeneration: 1,
      committedAtPerformanceMs: 1000,
    };
    expect(matchesCommittedInitialEmbed(committed, "v1", 12, 3000)).toBe(true);
  });
});
