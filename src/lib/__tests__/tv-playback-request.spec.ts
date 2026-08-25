import { describe, expect, it } from "vitest";

import {
  isSameOrchestratedPlayback,
  isUserIntentPlaybackReason,
} from "@/lib/tv-playback-request";

describe("isSameOrchestratedPlayback", () => {
  it("matches video and start within one second", () => {
    expect(
      isSameOrchestratedPlayback(
        { videoId: "abc", startSeconds: 10 },
        { videoId: "abc", startSeconds: 10.5 }
      )
    ).toBe(true);
  });

  it("rejects different videos or large seek drift", () => {
    expect(
      isSameOrchestratedPlayback(
        { videoId: "abc", startSeconds: 10 },
        { videoId: "def", startSeconds: 10 }
      )
    ).toBe(false);
    expect(
      isSameOrchestratedPlayback(
        { videoId: "abc", startSeconds: 10 },
        { videoId: "abc", startSeconds: 12 }
      )
    ).toBe(false);
    expect(
      isSameOrchestratedPlayback(null, { videoId: "abc", startSeconds: 0 })
    ).toBe(false);
  });
});

describe("isUserIntentPlaybackReason", () => {
  it("treats playlist and enforcement clicks as user intent", () => {
    expect(isUserIntentPlaybackReason("loadLocal")).toBe(true);
    expect(isUserIntentPlaybackReason("enforcement")).toBe(true);
  });

  it("does not treat sync or error recovery as user intent", () => {
    expect(isUserIntentPlaybackReason("syncToLive")).toBe(false);
    expect(isUserIntentPlaybackReason("error_reload")).toBe(false);
    expect(isUserIntentPlaybackReason("startup_error_recovery")).toBe(false);
  });
});
