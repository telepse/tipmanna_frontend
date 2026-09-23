import { describe, expect, it } from "vitest";

import {
  exploreEndedAdvanceScrollBehavior,
  shouldAdvanceExploreReelOnEnd,
  shouldCommitExploreActiveIndexOnScroll,
  shouldHandleExploreReelEnded,
  shouldPaginateExploreReelOnEnd,
} from "@/lib/explore-reel-advance";

describe("shouldAdvanceExploreReelOnEnd", () => {
  it("advances when active slide ends on feed surface", () => {
    expect(
      shouldAdvanceExploreReelOnEnd({
        feedSurfaceActive: true,
        slideIndex: 2,
        activeIndex: 2,
        itemCount: 5,
      })
    ).toBe(true);
  });

  it("skips when feed surface inactive", () => {
    expect(
      shouldAdvanceExploreReelOnEnd({
        feedSurfaceActive: false,
        slideIndex: 2,
        activeIndex: 2,
        itemCount: 5,
      })
    ).toBe(false);
  });

  it("skips stale slide index", () => {
    expect(
      shouldAdvanceExploreReelOnEnd({
        feedSurfaceActive: true,
        slideIndex: 1,
        activeIndex: 2,
        itemCount: 5,
      })
    ).toBe(false);
  });

  it("skips on last item", () => {
    expect(
      shouldAdvanceExploreReelOnEnd({
        feedSurfaceActive: true,
        slideIndex: 4,
        activeIndex: 4,
        itemCount: 5,
      })
    ).toBe(false);
  });
});

describe("shouldHandleExploreReelEnded", () => {
  it("handles last-item ENDED so pagination can run", () => {
    expect(
      shouldHandleExploreReelEnded({
        feedSurfaceActive: true,
        slideIndex: 4,
        activeIndex: 4,
      })
    ).toBe(true);
  });

  it("skips inactive feed surface and stale slides", () => {
    expect(
      shouldHandleExploreReelEnded({
        feedSurfaceActive: false,
        slideIndex: 2,
        activeIndex: 2,
      })
    ).toBe(false);
    expect(
      shouldHandleExploreReelEnded({
        feedSurfaceActive: true,
        slideIndex: 1,
        activeIndex: 2,
      })
    ).toBe(false);
  });
});

describe("shouldPaginateExploreReelOnEnd", () => {
  it("requests more items near end of loaded feed", () => {
    expect(shouldPaginateExploreReelOnEnd(9, 10, 5)).toBe(true);
  });

  it("does not paginate when feed is empty", () => {
    expect(shouldPaginateExploreReelOnEnd(0, 0, 5)).toBe(false);
  });
});

describe("exploreEndedAdvanceScrollBehavior", () => {
  it("uses auto scroll so activeIndex commits before next play", () => {
    expect(exploreEndedAdvanceScrollBehavior()).toBe("auto");
    expect(shouldCommitExploreActiveIndexOnScroll("auto")).toBe(true);
    expect(shouldCommitExploreActiveIndexOnScroll("smooth")).toBe(false);
  });
});
