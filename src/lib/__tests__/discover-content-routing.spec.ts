import { describe, expect, it } from "vitest";

import {
  isLiveStreamContent,
  isNonReelLiveStatus,
} from "../discover-content-routing";

describe("discover-content-routing live predicate", () => {
  it("treats only LIVE as live stream content", () => {
    expect(isLiveStreamContent({ liveStatus: "LIVE" })).toBe(true);
    expect(isLiveStreamContent({ liveStatus: "ENDED" })).toBe(false);
    expect(isLiveStreamContent({ liveStatus: "UPCOMING" })).toBe(false);
    expect(isLiveStreamContent({ liveStatus: "NOT_LIVE" })).toBe(false);
  });

  it("flags upcoming and ended as non-reel live statuses", () => {
    expect(isNonReelLiveStatus({ liveStatus: "UPCOMING" })).toBe(true);
    expect(isNonReelLiveStatus({ liveStatus: "ENDED" })).toBe(true);
    expect(isNonReelLiveStatus({ liveStatus: "LIVE" })).toBe(false);
  });
});
