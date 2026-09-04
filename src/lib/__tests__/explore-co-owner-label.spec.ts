import { describe, expect, it } from "vitest";

import {
  resolveExploreCoOwnerDrawerUsername,
  resolveExploreCoOwnerReelLabel,
} from "@/lib/explore-co-owner-label";

describe("resolveExploreCoOwnerReelLabel", () => {
  it("shows invite name while host is unclaimed", () => {
    expect(
      resolveExploreCoOwnerReelLabel({
        coOwnerName: "Alex Creator",
        coOwnerHostUsername: "alex123",
        coOwnerHostIsUnclaimed: true,
      })
    ).toBe("Alex Creator");
  });

  it("shows @username once host is claimed", () => {
    expect(
      resolveExploreCoOwnerReelLabel({
        coOwnerName: "Alex Creator",
        coOwnerHostUsername: "alexhost",
        coOwnerHostIsUnclaimed: false,
      })
    ).toBe("@alexhost");
  });

  it("falls back to invite name without username", () => {
    expect(
      resolveExploreCoOwnerReelLabel({
        coOwnerName: "Alex Creator",
        coOwnerHostUsername: null,
      })
    ).toBe("Alex Creator");
  });
});

describe("resolveExploreCoOwnerDrawerUsername", () => {
  it("keeps provisional username for drawer navigation", () => {
    expect(
      resolveExploreCoOwnerDrawerUsername({
        coOwnerHostUsername: "alex123",
        coOwnerHostIsUnclaimed: true,
      })
    ).toBe("alex123");
  });
});
