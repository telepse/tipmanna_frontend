import { describe, expect, it } from "vitest";

import { buildExploreFeedOpenTarget } from "../explore-feed-open";
import {
  resolveDiscoverContentTarget,
  shouldOpenLiveInChannelClient,
} from "../discover-content-routing";

describe("Discover explore handoff contract", () => {
  it("buildExploreFeedOpenTarget uses clicked content.id as videoId", () => {
    const target = buildExploreFeedOpenTarget({
      content: { id: "channel-abc", event: { id: "event-xyz" } },
    });
    expect(target).toEqual({
      videoId: "channel-abc",
      eventId: "event-xyz",
    });
  });

  it("returns null when event id is missing", () => {
    expect(
      buildExploreFeedOpenTarget({
        content: { id: "channel-abc", event: null },
      })
    ).toBeNull();
  });

  it("livestream family never targets explore reel when play handler exists", () => {
    const liveCases = [
      { liveStatus: "LIVE", isLive: false },
      { liveStatus: "UPCOMING", isLive: false },
      { liveStatus: "ENDED", isLive: false },
      { liveStatus: "NOT_LIVE", isLive: true },
    ] as const;

    for (const content of liveCases) {
      expect(shouldOpenLiveInChannelClient(content)).toBe(true);
      expect(
        resolveDiscoverContentTarget(content, "explorePanel", true)
      ).toBe("channel");
    }
  });

  it("VOD content uses explore reel when play handler exists", () => {
    const vod = { id: "vod-1", liveStatus: "NOT_LIVE", isLive: false };
    expect(shouldOpenLiveInChannelClient(vod)).toBe(false);
    expect(resolveDiscoverContentTarget(vod, "explorePanel", true)).toBe(
      "explore-reel"
    );
    expect(
      buildExploreFeedOpenTarget({
        content: { id: vod.id, event: { id: "ev-2" } },
      })
    ).toEqual({ videoId: "vod-1", eventId: "ev-2" });
  });
});
