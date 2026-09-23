import { describe, expect, it } from "vitest";

import {
  isCommunityExploreCatalogStale,
  type CommunityExploreCatalogSnapshot,
} from "../community-explore-catalog-cache";

describe("community-explore-catalog-cache", () => {
  it("isCommunityExploreCatalogStale detects expired snapshots", () => {
    const fresh: CommunityExploreCatalogSnapshot = {
      total: 1,
      alphabetical: [],
      topByTips: [],
      loadedAt: Date.now(),
    };
    expect(isCommunityExploreCatalogStale(fresh)).toBe(false);

    const stale: CommunityExploreCatalogSnapshot = {
      ...fresh,
      loadedAt: Date.now() - 11 * 60 * 1000,
    };
    expect(isCommunityExploreCatalogStale(stale)).toBe(true);
    expect(isCommunityExploreCatalogStale(null)).toBe(true);
  });
});
