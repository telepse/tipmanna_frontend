import { describe, expect, it } from "vitest";

import {
  MAX_STARTUP_PLAYER_RECOVERIES,
  classifyStartupPlayerError,
  classifyYoutubeErrorKind,
  createStartupPlaybackGuardState,
  findNextEligibleScheduleIndex,
  markStartupFirstPlay,
  resolvePositionSkippingFailedTargets,
  shouldSuppressDuplicatePrePlayLoad,
  shouldSuppressPrePlayDriftSeek,
} from "../tv-startup-playback-guard";

const extractId = (url: string) => {
  const m = url.match(/v=([^&]+)/);
  return m ? m[1]! : null;
};

describe("classifyYoutubeErrorKind", () => {
  it("maps documented permanent content codes", () => {
    expect(classifyYoutubeErrorKind(100)).toBe("permanent_content");
    expect(classifyYoutubeErrorKind(101)).toBe("permanent_content");
    expect(classifyYoutubeErrorKind(150)).toBe("permanent_content");
  });

  it("maps documented transient player codes", () => {
    expect(classifyYoutubeErrorKind(2)).toBe("transient_player");
    expect(classifyYoutubeErrorKind(5)).toBe("transient_player");
  });

  it("treats unknown codes conservatively", () => {
    expect(classifyYoutubeErrorKind(999)).toBe("unknown");
  });
});

describe("classifyStartupPlayerError", () => {
  const base = {
    videoId: "abc123",
    firstPlayReached: false,
    stablePlaybackReached: false,
    stabilityGuardEnabled: false,
    startupRecoveryCount: 0,
    failedVideoIds: new Set<string>(),
    transientRetriedVideoIds: new Set<string>(),
  };

  it("uses legacy path after first play", () => {
    expect(
      classifyStartupPlayerError({
        ...base,
        youtubeErrorCode: 100,
        firstPlayReached: true,
        stablePlaybackReached: false,
        stabilityGuardEnabled: false,
      }).action
    ).toBe("legacy_per_video");
  });

  it("advances on permanent content errors", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 101,
      stablePlaybackReached: false,
      stabilityGuardEnabled: false,
    });
    expect(d.action).toBe("advance_next");
    expect(d.reason).toBe("permanent_content_error");
  });

  it("retries once for transient errors", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 5,
      stablePlaybackReached: false,
      stabilityGuardEnabled: false,
    });
    expect(d.action).toBe("retry_once");
    expect(d.reason).toBe("transient_player_error");
  });

  it("advances after transient retry exhausted for same target", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 5,
      stablePlaybackReached: false,
      stabilityGuardEnabled: false,
      transientRetriedVideoIds: new Set(["abc123"]),
    });
    expect(d.action).toBe("advance_next");
  });

  it("skips already-failed targets without consuming recovery budget", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 100,
      stablePlaybackReached: false,
      stabilityGuardEnabled: false,
      failedVideoIds: new Set(["abc123"]),
    });
    expect(d.action).toBe("skip_failed_target");
  });

  it("stops at startup recovery cap", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 5,
      stablePlaybackReached: false,
      stabilityGuardEnabled: false,
      startupRecoveryCount: MAX_STARTUP_PLAYER_RECOVERIES,
    });
    expect(d.action).toBe("cap_reached");
  });

  it("uses conservative single retry for unknown codes", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 42,
      stablePlaybackReached: false,
      stabilityGuardEnabled: false,
    });
    expect(d.action).toBe("retry_once");
    expect(d.reason).toBe("unknown_error_code");
  });
});

describe("shouldSuppressPrePlayDriftSeek", () => {
  it("suppresses drift seeks before first play when guard enabled", () => {
    expect(
      shouldSuppressPrePlayDriftSeek({
        guardEnabled: true,
        firstPlayReached: false,
        isDriftCorrection: true,
      })
    ).toBe(true);
  });

  it("allows drift seeks after first play", () => {
    expect(
      shouldSuppressPrePlayDriftSeek({
        guardEnabled: true,
        firstPlayReached: true,
        isDriftCorrection: true,
      })
    ).toBe(false);
  });

  it("preserves legacy behavior when guard disabled", () => {
    expect(
      shouldSuppressPrePlayDriftSeek({
        guardEnabled: false,
        firstPlayReached: false,
        isDriftCorrection: true,
      })
    ).toBe(false);
  });
});

describe("shouldSuppressDuplicatePrePlayLoad", () => {
  const req = {
    videoId: "vid1",
    startSeconds: 120,
    reason: "syncToLive",
  };

  it("suppresses equivalent in-flight load", () => {
    expect(
      shouldSuppressDuplicatePrePlayLoad({
        guardEnabled: true,
        firstPlayReached: false,
        req,
        orchestrated: { videoId: "vid1", startSeconds: 120 },
        playerState: "BUFFERING",
        inFlightVideoId: "vid1",
      })
    ).toBe(true);
  });

  it("does not suppress genuinely different target", () => {
    expect(
      shouldSuppressDuplicatePrePlayLoad({
        guardEnabled: true,
        firstPlayReached: false,
        req,
        orchestrated: { videoId: "vid2", startSeconds: 0 },
        playerState: "BUFFERING",
        inFlightVideoId: "vid2",
      })
    ).toBe(false);
  });

  it("does not suppress explicit error recovery", () => {
    expect(
      shouldSuppressDuplicatePrePlayLoad({
        guardEnabled: true,
        firstPlayReached: false,
        req: { ...req, reason: "startup_error_recovery" },
        orchestrated: { videoId: "vid1", startSeconds: 120 },
        playerState: "BUFFERING",
        inFlightVideoId: "vid1",
      })
    ).toBe(false);
  });

  it("does not suppress after first play", () => {
    expect(
      shouldSuppressDuplicatePrePlayLoad({
        guardEnabled: true,
        firstPlayReached: true,
        req,
        orchestrated: { videoId: "vid1", startSeconds: 120 },
        playerState: "BUFFERING",
        inFlightVideoId: "vid1",
      })
    ).toBe(false);
  });
});

describe("findNextEligibleScheduleIndex", () => {
  const items = [
    { channel: { url: "https://youtube.com/watch?v=bad1" } },
    { channel: { url: "https://youtube.com/watch?v=bad2" } },
    { segmentKind: "notice" as const, channel: { url: "" } },
    { channel: { url: "https://youtube.com/watch?v=ok1" } },
  ];

  it("skips failed and notice rows", () => {
    const failed = new Set(["bad1", "bad2"]);
    expect(findNextEligibleScheduleIndex(items, 0, failed, extractId)).toBe(3);
  });

  it("returns null when no eligible target remains", () => {
    const failed = new Set(["bad1", "bad2", "ok1"]);
    expect(
      findNextEligibleScheduleIndex(items, 0, failed, extractId)
    ).toBeNull();
  });
});

describe("resolvePositionSkippingFailedTargets", () => {
  const items = [
    {
      channel: { url: "https://youtube.com/watch?v=bad1" },
      seekBaseSeconds: 0,
    },
    {
      channel: { url: "https://youtube.com/watch?v=ok1" },
      seekBaseSeconds: 10,
    },
  ];

  it("skips failed broadcast target before first play", () => {
    const pos = {
      scheduleIndex: 0,
      offsetSeconds: 45,
      item: items[0]!,
    };
    const next = resolvePositionSkippingFailedTargets(
      pos,
      items,
      new Set(["bad1"]),
      extractId
    );
    expect(next.scheduleIndex).toBe(1);
    expect(next.offsetSeconds).toBe(10);
  });
});

describe("startup playback lifecycle", () => {
  it("marks first play permanently for a startup", () => {
    const guard = createStartupPlaybackGuardState();
    expect(markStartupFirstPlay(guard)).toBe(true);
    expect(guard.firstPlayReached).toBe(true);
    expect(markStartupFirstPlay(guard)).toBe(false);
  });
});
