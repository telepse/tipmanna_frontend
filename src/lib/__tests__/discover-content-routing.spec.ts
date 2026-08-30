import { describe, expect, it } from "vitest";

import {
  isLivestreamFamily,
  isLiveStreamContent,
  isNonReelLiveStatus,
  shouldOpenExploreHandoffInChannel,
  shouldOpenLiveInChannelClient,
} from "../discover-content-routing";

describe("discover-content-routing live predicate", () => {
  it("treats LIVE liveStatus or host isLive as live stream content", () => {
    expect(isLiveStreamContent({ liveStatus: "LIVE" })).toBe(true);
    expect(isLiveStreamContent({ isLive: true })).toBe(true);
    expect(isLiveStreamContent({ liveStatus: "ENDED" })).toBe(false);
    expect(isLiveStreamContent({ liveStatus: "UPCOMING" })).toBe(false);
    expect(isLiveStreamContent({ liveStatus: "NOT_LIVE" })).toBe(false);
  });

  it("treats livestream family as channel-client candidates from Discover", () => {
    expect(isLivestreamFamily({ liveStatus: "LIVE" })).toBe(true);
    expect(isLivestreamFamily({ liveStatus: "UPCOMING" })).toBe(true);
    expect(isLivestreamFamily({ liveStatus: "ENDED" })).toBe(true);
    expect(isLivestreamFamily({ isLive: true })).toBe(true);
    expect(isLivestreamFamily({ liveStatus: "NOT_LIVE" })).toBe(false);
  });

  it("flags upcoming and ended as non-reel live statuses", () => {
    expect(isNonReelLiveStatus({ liveStatus: "UPCOMING" })).toBe(true);
    expect(isNonReelLiveStatus({ liveStatus: "ENDED" })).toBe(true);
    expect(isNonReelLiveStatus({ liveStatus: "LIVE" })).toBe(false);
  });

  it("opens channel client for entire livestream family from Discover", () => {
    expect(shouldOpenLiveInChannelClient({ liveStatus: "LIVE" })).toBe(true);
    expect(shouldOpenLiveInChannelClient({ isLive: true })).toBe(true);
    expect(shouldOpenLiveInChannelClient({ liveStatus: "UPCOMING" })).toBe(
      true
    );
    expect(shouldOpenLiveInChannelClient({ liveStatus: "ENDED" })).toBe(true);
  });

  it("Explore handoff redirects LIVE/UPCOMING/isLive but not ENDED-only", () => {
    expect(shouldOpenExploreHandoffInChannel({ liveStatus: "LIVE" })).toBe(
      true
    );
    expect(shouldOpenExploreHandoffInChannel({ liveStatus: "UPCOMING" })).toBe(
      true
    );
    expect(shouldOpenExploreHandoffInChannel({ isLive: true })).toBe(true);
    expect(shouldOpenExploreHandoffInChannel({ liveStatus: "ENDED" })).toBe(
      false
    );
    expect(
      shouldOpenExploreHandoffInChannel({
        isLive: true,
        liveStatus: "UPCOMING",
      })
    ).toBe(true);
  });
});
