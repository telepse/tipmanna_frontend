import { describe, expect, it } from "vitest";

import { isCommunityAlreadyIn } from "@/lib/community-already-in";

describe("isCommunityAlreadyIn", () => {
  it("returns true for active members", () => {
    expect(
      isCommunityAlreadyIn({ isMember: true, viewerHostsCommunity: false })
    ).toBe(true);
  });

  it("returns true for community owners without a membership row", () => {
    expect(
      isCommunityAlreadyIn({ isMember: false, viewerHostsCommunity: true })
    ).toBe(true);
  });

  it("returns false for non-members", () => {
    expect(
      isCommunityAlreadyIn({ isMember: false, viewerHostsCommunity: false })
    ).toBe(false);
  });
});
