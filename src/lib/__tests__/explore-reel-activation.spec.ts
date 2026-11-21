import { describe, expect, it } from "vitest";
import {
  EXPLORE_ACTIVATION_READY_MAX_ATTEMPTS,
  EXPLORE_ACTIVATION_READY_RETRY_MS,
  shouldUnmuteOnExploreReelActivation,
} from "../explore-reel-activation";

describe("explore-reel-activation", () => {
  it("retries ready poll within bounded window", () => {
    expect(EXPLORE_ACTIVATION_READY_RETRY_MS).toBe(120);
    expect(EXPLORE_ACTIVATION_READY_MAX_ATTEMPTS).toBe(8);
    expect(
      EXPLORE_ACTIVATION_READY_RETRY_MS * EXPLORE_ACTIVATION_READY_MAX_ATTEMPTS
    ).toBeGreaterThanOrEqual(800);
  });

  it("unmutes on activation only when sound wanted and not iOS-deferred", () => {
    expect(shouldUnmuteOnExploreReelActivation(true, false)).toBe(true);
    expect(shouldUnmuteOnExploreReelActivation(true, true)).toBe(false);
    expect(shouldUnmuteOnExploreReelActivation(false, false)).toBe(false);
  });
});
