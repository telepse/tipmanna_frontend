import { describe, expect, it } from "vitest";

import { syncCreatorProfileTabToUrl } from "@/lib/creator-profile-tab-url";

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
