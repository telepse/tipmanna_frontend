import { describe, expect, it } from "vitest";

import {
  getExploreTvFeedMuted,
  setExploreTvFeedMuted,
  toggleExploreTvFeedMuted,
} from "../explore-tv-feed-mute";

describe("explore-tv-feed-mute", () => {
  it("starts muted and toggles in memory", () => {
    setExploreTvFeedMuted(true);
    expect(getExploreTvFeedMuted()).toBe(true);
    toggleExploreTvFeedMuted();
    expect(getExploreTvFeedMuted()).toBe(false);
    setExploreTvFeedMuted(true);
    expect(getExploreTvFeedMuted()).toBe(true);
  });
});
