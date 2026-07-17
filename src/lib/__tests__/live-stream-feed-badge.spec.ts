import { describe, expect, it } from "vitest";

import {
  liveStreamFeedBadgeLabel,
  liveStreamFeedBadgeVisible,
} from "@/components/video/live-stream-feed-badge";

describe("LiveStreamFeedBadge", () => {
  it("shows badge text for LIVE vs ENDED", () => {
    expect(liveStreamFeedBadgeLabel("LIVE")).toBe("Live stream");
    expect(liveStreamFeedBadgeLabel("ENDED")).toBe("Live stream · Completed");
  });

  it("hides for UPCOMING, NOT_LIVE, and null", () => {
    expect(liveStreamFeedBadgeVisible("UPCOMING")).toBe(false);
    expect(liveStreamFeedBadgeVisible("NOT_LIVE")).toBe(false);
    expect(liveStreamFeedBadgeVisible(null)).toBe(false);
  });
});
