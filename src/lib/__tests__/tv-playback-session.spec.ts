/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  bumpTvCommandGeneration,
  clearTvPlaybackSnapshotForTests,
  isStaleTvCommandGeneration,
  readTvPlaybackSnapshot,
  resetTvCommandGenerationForTests,
  writeTvPlaybackSnapshot,
} from "@/lib/tv-playback-session";

describe("tv-playback-session", () => {
  afterEach(() => {
    resetTvCommandGenerationForTests();
    clearTvPlaybackSnapshotForTests();
  });

  it("command generation helper remains monotonic (not used by live TvPlayer)", () => {
    const g1 = bumpTvCommandGeneration();
    expect(g1).toBe(1);
    expect(isStaleTvCommandGeneration(1)).toBe(false);
    bumpTvCommandGeneration();
    expect(isStaleTvCommandGeneration(1)).toBe(true);
    expect(isStaleTvCommandGeneration(2)).toBe(false);
  });

  it("writes and reads playback snapshot from sessionStorage", () => {
    writeTvPlaybackSnapshot({
      mode: "LOCAL",
      currentIndex: 3,
      startSeconds: 42.5,
      videoId: "abc123",
      communityId: null,
    });
    const snap = readTvPlaybackSnapshot();
    expect(snap?.mode).toBe("LOCAL");
    expect(snap?.currentIndex).toBe(3);
    expect(snap?.startSeconds).toBe(42.5);
    expect(snap?.videoId).toBe("abc123");
    expect(typeof snap?.at).toBe("number");
  });
});
