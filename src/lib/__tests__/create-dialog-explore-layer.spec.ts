import { describe, expect, it } from "vitest";

import { shouldUseExploreCreateLayer } from "@/lib/create-dialog-explore-layer";

describe("shouldUseExploreCreateLayer", () => {
  it("returns true for /explore and subpaths", () => {
    expect(shouldUseExploreCreateLayer("/explore")).toBe(true);
    expect(shouldUseExploreCreateLayer("/explore/feed")).toBe(true);
  });

  it("returns false for other routes", () => {
    expect(shouldUseExploreCreateLayer("/")).toBe(false);
    expect(shouldUseExploreCreateLayer("/tv")).toBe(false);
    expect(shouldUseExploreCreateLayer("/host/my-slug")).toBe(false);
    expect(shouldUseExploreCreateLayer(null)).toBe(false);
  });
});
