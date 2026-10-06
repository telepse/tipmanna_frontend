import { describe, expect, it } from "vitest";

import {
  buildCreatorProfileSharePathWithQuery,
  shouldApplyCreatorProfileTabFromUrl,
  syncCreatorProfileTabToUrl,
} from "@/lib/creator-profile-tab-url";

describe("syncCreatorProfileTabToUrl", () => {
  it("writes tab= on standalone creator page", () => {
    expect(
      syncCreatorProfileTabToUrl({
        variant: "page",
        pathname: "/creator/alice",
        currentQuery: "foo=1",
        tab: "channels",
      })
    ).toBe("/creator/alice?foo=1&tab=channels");
  });

  it("does not write tab= from Explore drawer", () => {
    expect(
      syncCreatorProfileTabToUrl({
        variant: "drawer",
        pathname: "/explore",
        currentQuery: "creatorDrawer=alice&feedTab=trends",
        tab: "events",
      })
    ).toBeNull();
  });
});

describe("buildCreatorProfileSharePathWithQuery", () => {
  it("preserves tab from current query on username path", () => {
    expect(
      buildCreatorProfileSharePathWithQuery("bob", "tab=communities&play=1")
    ).toBe("/@bob?tab=communities&play=1");
  });

  it("prefers explicit activeTab over query tab", () => {
    expect(
      buildCreatorProfileSharePathWithQuery("bob", "tab=events", {
        activeTab: "communities",
      })
    ).toBe("/@bob?tab=communities");
  });
});

describe("shouldApplyCreatorProfileTabFromUrl", () => {
  const isValidTab = (tab: string) =>
    ["all_videos", "communities", "events"].includes(tab);

  it("ignores stale URL while pending tab differs", () => {
    expect(
      shouldApplyCreatorProfileTabFromUrl({
        urlTab: "all_videos",
        pendingTab: "communities",
        isValidTab,
      })
    ).toBe(false);
  });

  it("applies when URL matches pending tab", () => {
    expect(
      shouldApplyCreatorProfileTabFromUrl({
        urlTab: "communities",
        pendingTab: "communities",
        isValidTab,
      })
    ).toBe(true);
  });

  it("applies when no pending navigation", () => {
    expect(
      shouldApplyCreatorProfileTabFromUrl({
        urlTab: "events",
        pendingTab: null,
        isValidTab,
      })
    ).toBe(true);
  });
});
