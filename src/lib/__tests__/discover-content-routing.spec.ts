import { describe, expect, it } from "vitest";

import {
  isLiveStreamContent,
  resolveDiscoverContentTarget,
} from "../discover-content-routing";

describe("discover content routing", () => {
  it("detects live stream statuses", () => {
    expect(isLiveStreamContent({ liveStatus: "LIVE" })).toBe(true);
    expect(isLiveStreamContent({ liveStatus: "ENDED" })).toBe(true);
    expect(isLiveStreamContent({ liveStatus: "UPCOMING" })).toBe(true);
    expect(isLiveStreamContent({ liveStatus: null })).toBe(false);
    expect(isLiveStreamContent({})).toBe(false);
  });

  it("routes live items to explore reel when Explore playback is wired", () => {
    const live = { liveStatus: "LIVE" as const };
    expect(resolveDiscoverContentTarget(live, "discovery", false)).toBe(
      "channel"
    );
    expect(resolveDiscoverContentTarget(live, "exploreTab", true)).toBe(
      "explore-reel"
    );
  });

  it("routes clips to explore reel on any surface that provides a play handler", () => {
    const clip = { liveStatus: null };
    expect(resolveDiscoverContentTarget(clip, "exploreTab", true)).toBe(
      "explore-reel"
    );
    expect(resolveDiscoverContentTarget(clip, "exploreTab", false)).toBe(
      "content"
    );
    // Dedicated Discover page now reuses Explore playback when a handler exists.
    expect(resolveDiscoverContentTarget(clip, "discovery", true)).toBe(
      "explore-reel"
    );
    expect(resolveDiscoverContentTarget(clip, "discovery", false)).toBe(
      "content"
    );
  });

  it("does not treat missing liveStatus as live stream", () => {
    expect(resolveDiscoverContentTarget({}, "discovery", false)).toBe(
      "content"
    );
  });
});
