import { describe, expect, it } from "vitest";

import { isCommunityTvEntitledFromAccessState } from "@/lib/community-tv-entitlement";

describe("isCommunityTvEntitledFromAccessState", () => {
  it("fail-closed on null/undefined data", () => {
    expect(isCommunityTvEntitledFromAccessState(null)).toBe(false);
    expect(isCommunityTvEntitledFromAccessState(undefined)).toBe(false);
  });

  it("prefers communityTvViewerEntitled when boolean", () => {
    expect(
      isCommunityTvEntitledFromAccessState({
        communityTvViewerEntitled: true,
        isMember: false,
        viewerHostsCommunity: false,
      })
    ).toBe(true);
    expect(
      isCommunityTvEntitledFromAccessState({
        communityTvViewerEntitled: false,
        isMember: true,
        viewerHostsCommunity: true,
      })
    ).toBe(false);
  });

  it("falls back to isCommunityAlreadyIn when flag absent", () => {
    expect(
      isCommunityTvEntitledFromAccessState({
        isMember: true,
        viewerHostsCommunity: false,
      })
    ).toBe(true);
    expect(
      isCommunityTvEntitledFromAccessState({
        isMember: false,
        viewerHostsCommunity: true,
      })
    ).toBe(true);
    expect(
      isCommunityTvEntitledFromAccessState({
        isMember: false,
        viewerHostsCommunity: false,
      })
    ).toBe(false);
  });

  it("active co-creator without membership row via backend flag", () => {
    expect(
      isCommunityTvEntitledFromAccessState({
        communityTvViewerEntitled: true,
        isMember: false,
        viewerHostsCommunity: false,
      })
    ).toBe(true);
  });
});
