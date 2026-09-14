import { describe, expect, it } from "vitest";

import { shouldLoadTipStripe } from "@/lib/should-load-tip-stripe";

describe("shouldLoadTipStripe", () => {
  it("returns false in host preview mode", () => {
    expect(shouldLoadTipStripe({ previewMode: true, drawerOpen: true })).toBe(
      false
    );
  });

  it("returns false when the drawer is closed", () => {
    expect(shouldLoadTipStripe({ previewMode: false, drawerOpen: false })).toBe(
      false
    );
  });

  it("returns true only for a live open drawer", () => {
    expect(shouldLoadTipStripe({ previewMode: false, drawerOpen: true })).toBe(
      true
    );
  });
});
