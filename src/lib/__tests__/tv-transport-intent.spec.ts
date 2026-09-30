import { describe, expect, it } from "vitest";

import {
  resolvePendingTransportIntent,
  shouldClearPendingTransportOnSourceChange,
} from "@/lib/tv-transport-intent";

describe("resolvePendingTransportIntent", () => {
  it("queues pause only when the player is PLAYING or BUFFERING", () => {
    expect(resolvePendingTransportIntent({ playerState: "PLAYING" })).toBe(
      "pause"
    );
    expect(resolvePendingTransportIntent({ playerState: "BUFFERING" })).toBe(
      "pause"
    );
  });

  it("queues play when state is null or not actively playing", () => {
    expect(resolvePendingTransportIntent({ playerState: null })).toBe("play");
    expect(resolvePendingTransportIntent({ playerState: undefined })).toBe(
      "play"
    );
    expect(resolvePendingTransportIntent({ playerState: "PAUSED" })).toBe(
      "play"
    );
    expect(resolvePendingTransportIntent({ playerState: "CUED" })).toBe("play");
    expect(resolvePendingTransportIntent({ playerState: "UNSTARTED" })).toBe(
      "play"
    );
  });
});

describe("shouldClearPendingTransportOnSourceChange", () => {
  it("clears when community A switches to community B", () => {
    expect(
      shouldClearPendingTransportOnSourceChange({
        previousCommunityId: "a",
        nextCommunityId: "b",
      })
    ).toBe(true);
  });

  it("clears when switching between global and community", () => {
    expect(
      shouldClearPendingTransportOnSourceChange({
        previousCommunityId: null,
        nextCommunityId: "b",
      })
    ).toBe(true);
  });

  it("does not clear when source identity is unchanged", () => {
    expect(
      shouldClearPendingTransportOnSourceChange({
        previousCommunityId: "a",
        nextCommunityId: "a",
      })
    ).toBe(false);
    expect(
      shouldClearPendingTransportOnSourceChange({
        previousCommunityId: null,
        nextCommunityId: null,
      })
    ).toBe(false);
  });
});
