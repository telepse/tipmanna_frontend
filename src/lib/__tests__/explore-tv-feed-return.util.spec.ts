import { describe, expect, it } from "vitest";

import { isDedicatedTvFeedReturnTo } from "../explore-tv-feed-return.util";

describe("isDedicatedTvFeedReturnTo", () => {
  it("matches Explore TV feed URLs", () => {
    expect(isDedicatedTvFeedReturnTo("/explore?feedTab=tv")).toBe(true);
    expect(isDedicatedTvFeedReturnTo("/explore?tab=feed&feedTab=tv")).toBe(
      true
    );
  });

  it("rejects non-TV explore URLs", () => {
    expect(isDedicatedTvFeedReturnTo("/explore?feedTab=trends")).toBe(false);
    expect(isDedicatedTvFeedReturnTo("/discover")).toBe(false);
  });
});
