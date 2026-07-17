import { describe, expect, it } from "vitest";

import { shouldApplyDiscoverSearchResult } from "../discover-search-generation";

describe("discover search generation", () => {
  it("allows updates from the current generation", () => {
    expect(shouldApplyDiscoverSearchResult(3, 3)).toBe(true);
  });

  it("rejects stale generations after a newer search started", () => {
    expect(shouldApplyDiscoverSearchResult(2, 3)).toBe(false);
  });

  it("rejects stale generations after search was cleared", () => {
    expect(shouldApplyDiscoverSearchResult(1, 2)).toBe(false);
  });
});
