import { describe, expect, it } from "vitest";

import {
  isExploreFeedTabForDrawerGlance,
  resolveInitialExploreDrawerHydrate,
} from "../explore-drawer-hydrate";

describe("explore-drawer-hydrate", () => {
  it("feed tab is visible for drawer glance", () => {
    expect(isExploreFeedTabForDrawerGlance(new URLSearchParams())).toBe(true);
    expect(
      isExploreFeedTabForDrawerGlance(new URLSearchParams("feedTab=tv"))
    ).toBe(true);
  });

  it("join and other main tabs skip drawer glance", () => {
    expect(
      isExploreFeedTabForDrawerGlance(new URLSearchParams("tab=join"))
    ).toBe(false);
    expect(
      isExploreFeedTabForDrawerGlance(new URLSearchParams("tab=discover"))
    ).toBe(false);
  });

  it("resolveInitialExploreDrawerHydrate prefers URL over session intent once", () => {
    const intent = { kind: "community" as const, communityId: "from-session" };
    expect(
      resolveInitialExploreDrawerHydrate({
        creatorFromUrl: "alice",
        communityFromUrl: null,
        intent,
        feedTabVisible: true,
      })
    ).toEqual({ kind: "creator", username: "alice" });
  });

  it("returns null when feed tab is not visible (e.g. join)", () => {
    expect(
      resolveInitialExploreDrawerHydrate({
        creatorFromUrl: "alice",
        communityFromUrl: null,
        intent: { kind: "creator", username: "bob" },
        feedTabVisible: false,
      })
    ).toBeNull();
  });
});
