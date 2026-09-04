import { describe, expect, it } from "vitest";

import {
  isSameOrchestratedPlayback,
  isUserIntentPlaybackReason,
  resolveUnchangedPlaybackAction,
} from "@/lib/tv-playback-request";

describe("resolveUnchangedPlaybackAction", () => {
  it("replays when user intent and player ready", () => {
    expect(
      resolveUnchangedPlaybackAction({ userIntent: true, playerReady: true })
    ).toBe("replay");
  });

  it("queues when user intent but player not ready", () => {
    expect(
      resolveUnchangedPlaybackAction({ userIntent: true, playerReady: false })
    ).toBe("queue");
  });

  it("skips duplicate non-user playback", () => {
    expect(
      resolveUnchangedPlaybackAction({ userIntent: false, playerReady: true })
    ).toBe("skip");
  });
});

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
