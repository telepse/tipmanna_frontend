import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS,
  INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE,
  isExploreNeverPlayingRecoveryEligible,
  reduceExploreNeverPlayingRecovery,
} from "../explore-never-playing-recovery";

const exploreFeedSrc = readFileSync(
  resolve(__dirname, "../../components/explore/explore-feed-client.tsx"),
  "utf8"
);

const baseInput = {
  eligible: true,
  isBuffering: false,
  hasReachedPlaying: false,
  watchKey: "0:abc:0",
};

describe("isExploreNeverPlayingRecoveryEligible", () => {
  it("requires active surface and reel, not tip drawer or user pause", () => {
    expect(
      isExploreNeverPlayingRecoveryEligible({
        feedSurfaceActive: true,
        playbackActive: true,
        tipDrawerOpen: false,
        userIntentionallyPaused: false,
      })
    ).toBe(true);
    expect(
      isExploreNeverPlayingRecoveryEligible({
        feedSurfaceActive: false,
        playbackActive: true,
        tipDrawerOpen: false,
        userIntentionallyPaused: false,
      })
    ).toBe(false);
    expect(
      isExploreNeverPlayingRecoveryEligible({
        feedSurfaceActive: true,
        playbackActive: true,
        tipDrawerOpen: true,
        userIntentionallyPaused: false,
      })
    ).toBe(false);
    expect(
      isExploreNeverPlayingRecoveryEligible({
        feedSurfaceActive: true,
        playbackActive: true,
        tipDrawerOpen: false,
        userIntentionallyPaused: true,
      })
    ).toBe(false);
  });
});

describe("reduceExploreNeverPlayingRecovery", () => {
  it("does not show recovery immediately", () => {
    const step = reduceExploreNeverPlayingRecovery(
      INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE,
      baseInput,
      0
    );
    expect(step.showTapToPlay).toBe(false);
  });

  it("shows recovery after threshold when never PLAYING", () => {
    let state = INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE;
    const t0 = 1_000;
    let show = false;
    for (
      let t = t0;
      t <= t0 + EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS;
      t += 500
    ) {
      const step = reduceExploreNeverPlayingRecovery(state, baseInput, t);
      state = step.state;
      show = step.showTapToPlay;
    }
    expect(show).toBe(true);
  });

  it("PLAYING before threshold prevents recovery", () => {
    const step = reduceExploreNeverPlayingRecovery(
      INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE,
      { ...baseInput, hasReachedPlaying: true },
      EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS + 5_000
    );
    expect(step.showTapToPlay).toBe(false);
  });

  it("PLAYING after threshold clears recovery", () => {
    let state = INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE;
    const t0 = 0;
    for (
      let t = t0;
      t <= t0 + EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS;
      t += 1_000
    ) {
      ({ state } = reduceExploreNeverPlayingRecovery(state, baseInput, t));
    }
    const cleared = reduceExploreNeverPlayingRecovery(
      state,
      { ...baseInput, hasReachedPlaying: true },
      t0 + EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS + 100
    );
    expect(cleared.showTapToPlay).toBe(false);
  });

  it("watchKey change resets timer", () => {
    let state = INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE;
    const t0 = 0;
    for (
      let t = t0;
      t < t0 + EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS;
      t += 1_000
    ) {
      ({ state } = reduceExploreNeverPlayingRecovery(state, baseInput, t));
    }
    const afterKey = reduceExploreNeverPlayingRecovery(
      state,
      { ...baseInput, watchKey: "1:xyz:0" },
      t0 + EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS + 100
    );
    expect(afterKey.showTapToPlay).toBe(false);
  });

  it("BUFFERING does not show recovery", () => {
    const step = reduceExploreNeverPlayingRecovery(
      INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE,
      { ...baseInput, isBuffering: true },
      EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS + 5_000
    );
    expect(step.showTapToPlay).toBe(false);
  });

  it("user pause after play suppresses via ineligible input", () => {
    const step = reduceExploreNeverPlayingRecovery(
      INITIAL_EXPLORE_NEVER_PLAYING_RECOVERY_STATE,
      { ...baseInput, eligible: false },
      EXPLORE_NEVER_PLAYING_RECOVERY_THRESHOLD_MS + 5_000
    );
    expect(step.showTapToPlay).toBe(false);
  });
});

describe("Explore feed integration", () => {
  it("never PLAYING first interaction calls play, not pause branch", () => {
    expect(exploreFeedSrc).toContain("hasReachedPlayingRef.current");
    expect(exploreFeedSrc).toMatch(
      /if \(!hasReachedPlayingRef\.current\) \{[\s\S]*?startPlaybackFromUserGesture/
    );
    expect(exploreFeedSrc).toContain('data-testid="explore-tap-to-play"');
  });

  it("does not auto-skip on never-PLAYING", () => {
    expect(exploreFeedSrc).not.toMatch(
      /observeNeverPlayingRecovery[\s\S]{0,800}advanceReelAfterEnd/
    );
    expect(exploreFeedSrc).not.toMatch(
      /showTapToPlay[\s\S]{0,400}scrollToIndex/
    );
    expect(exploreFeedSrc).not.toMatch(
      /reduceExploreNeverPlayingRecovery[\s\S]{0,600}setActiveIndex/
    );
  });

  it("Stage 2 programmatic mute contract intact", () => {
    expect(exploreFeedSrc).toContain(
      "restoreSessionSoundOnProgrammaticPlay={false}"
    );
    expect(exploreFeedSrc).toMatch(/initialMuted[\s\S]*restoreSessionSound/);
    expect(exploreFeedSrc).not.toMatch(
      /if \(!loadReelSoundPref\(\)\) return;\s*const p = slideIndex === activeIndex[\s\S]*?p\.unmute\(\)/
    );
  });

  it("ENDED still uses existing advance handler", () => {
    expect(exploreFeedSrc).toContain("onActiveReelEnded={advanceReelAfterEnd}");
  });
});
