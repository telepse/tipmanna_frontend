import { describe, expect, it } from "vitest";

import {
  MAX_STARTUP_PLAYER_RECOVERIES,
  classifyStartupPlayerError,
  createStartupPlaybackGuardState,
  evaluatePreStableDriftSeek,
  getStartupErrorLifecyclePhase,
  isStartupStabilityContainmentActive,
  markStartupFirstPlay,
  markStartupStablePlayback,
  shouldUseStartupErrorContainment,
} from "../tv-startup-playback-guard";

describe("shouldUseStartupErrorContainment", () => {
  it("uses containment before first play when stability guard off", () => {
    expect(
      shouldUseStartupErrorContainment({
        stabilityGuardEnabled: false,
        stablePlaybackReached: false,
        firstPlayReached: false,
      })
    ).toBe(true);
  });

  it("releases to legacy after first play when stability guard off", () => {
    expect(
      shouldUseStartupErrorContainment({
        stabilityGuardEnabled: false,
        stablePlaybackReached: false,
        firstPlayReached: true,
      })
    ).toBe(false);
  });

  it("keeps containment after first play until stable when stability guard on", () => {
    expect(
      shouldUseStartupErrorContainment({
        stabilityGuardEnabled: true,
        stablePlaybackReached: false,
        firstPlayReached: true,
      })
    ).toBe(true);
  });

  it("releases after stable when stability guard on", () => {
    expect(
      shouldUseStartupErrorContainment({
        stabilityGuardEnabled: true,
        stablePlaybackReached: true,
        firstPlayReached: true,
      })
    ).toBe(false);
  });
});

describe("classifyStartupPlayerError with stability guard", () => {
  const base = {
    videoId: "vid1",
    startupRecoveryCount: 0,
    failedVideoIds: new Set<string>(),
    transientRetriedVideoIds: new Set<string>(),
  };

  it("continues startup recovery for code 150 after first play before stable", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 150,
      firstPlayReached: true,
      stablePlaybackReached: false,
      stabilityGuardEnabled: true,
    });
    expect(d.action).toBe("advance_next");
  });

  it("uses legacy path after stable playback", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 150,
      firstPlayReached: true,
      stablePlaybackReached: true,
      stabilityGuardEnabled: true,
    });
    expect(d.action).toBe("legacy_per_video");
  });

  it("uses legacy after first play when stability guard disabled", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 150,
      firstPlayReached: true,
      stablePlaybackReached: false,
      stabilityGuardEnabled: false,
    });
    expect(d.action).toBe("legacy_per_video");
  });

  it("counts second error toward cap before stable", () => {
    const d = classifyStartupPlayerError({
      ...base,
      youtubeErrorCode: 150,
      firstPlayReached: true,
      stablePlaybackReached: false,
      stabilityGuardEnabled: true,
      startupRecoveryCount: MAX_STARTUP_PLAYER_RECOVERIES,
    });
    expect(d.action).toBe("cap_reached");
  });
});

describe("evaluatePreStableDriftSeek", () => {
  it("suppresses drift seek while buffering after first play", () => {
    const d = evaluatePreStableDriftSeek({
      stabilityContainmentActive: true,
      firstPlayReached: true,
      playerState: "BUFFERING",
      videoId: "v1",
      preStableCorrectiveSeekVideoId: null,
      isDriftCorrection: true,
    });
    expect(d.suppress).toBe(true);
    if (d.suppress) expect(d.reason).toBe("non_playing_state");
  });

  it("allows one corrective seek while PLAYING", () => {
    const d = evaluatePreStableDriftSeek({
      stabilityContainmentActive: true,
      firstPlayReached: true,
      playerState: "PLAYING",
      videoId: "v1",
      preStableCorrectiveSeekVideoId: null,
      isDriftCorrection: true,
    });
    expect(d).toEqual({ suppress: false, issueCorrective: true });
  });

  it("suppresses repeated corrective seek for same video", () => {
    const d = evaluatePreStableDriftSeek({
      stabilityContainmentActive: true,
      firstPlayReached: true,
      playerState: "PLAYING",
      videoId: "v1",
      preStableCorrectiveSeekVideoId: "v1",
      isDriftCorrection: true,
    });
    expect(d.suppress).toBe(true);
    if (d.suppress) expect(d.reason).toBe("corrective_already_issued");
  });

  it("does not affect post-stable drift when containment inactive", () => {
    const d = evaluatePreStableDriftSeek({
      stabilityContainmentActive: false,
      firstPlayReached: true,
      playerState: "BUFFERING",
      videoId: "v1",
      preStableCorrectiveSeekVideoId: null,
      isDriftCorrection: true,
    });
    expect(d).toEqual({ suppress: false, issueCorrective: false });
  });
});

describe("startup lifecycle phases", () => {
  it("reports lifecycle phases correctly", () => {
    const guard = createStartupPlaybackGuardState();
    expect(getStartupErrorLifecyclePhase(guard)).toBe("before_first_play");
    markStartupFirstPlay(guard);
    expect(getStartupErrorLifecyclePhase(guard)).toBe(
      "after_first_play_before_stable"
    );
    markStartupStablePlayback(guard);
    expect(getStartupErrorLifecyclePhase(guard)).toBe("after_stable");
  });
});

describe("isStartupStabilityContainmentActive", () => {
  it("is active only when both flags on and not terminal/stable", () => {
    const guard = createStartupPlaybackGuardState();
    expect(isStartupStabilityContainmentActive(true, true, guard)).toBe(true);
    markStartupStablePlayback(guard);
    expect(isStartupStabilityContainmentActive(true, true, guard)).toBe(false);
  });
});
