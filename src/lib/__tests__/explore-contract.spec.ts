/**
 * Explore lock — aggregates contract coverage.
 * Deep cases: explore-reel-audio-policy.spec.ts, explore-never-playing-recovery.spec.ts, explore-reel-advance.spec.ts
 */
import { describe, expect, it } from "vitest";

import {
  resolveExploreReelPlayerAudioProps,
  shouldDeferProgrammaticUnmute,
} from "../explore-reel-audio-policy";
import { shouldHandleExploreReelEnded } from "../explore-reel-advance";

describe("LOCKED EXPLORE CONTRACT", () => {
  it("non-iOS restores session sound programmatically when want-sound", () => {
    expect(
      resolveExploreReelPlayerAudioProps({ defer: false, wantsSound: true })
    ).toEqual({
      initialMuted: false,
      restoreSessionSoundOnProgrammaticPlay: true,
    });
  });

  it("iOS defers programmatic unmute", () => {
    expect(
      shouldDeferProgrammaticUnmute(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
      )
    ).toBe(true);
  });

  it("ENDED handler rejects inactive slide", () => {
    expect(
      shouldHandleExploreReelEnded({
        feedSurfaceActive: true,
        slideIndex: 0,
        activeIndex: 1,
      })
    ).toBe(false);
  });
});
