import { describe, expect, it } from "vitest";
import { shouldNavigateAfterTipperVerify } from "../tipper-otp-redirect";

describe("shouldNavigateAfterTipperVerify", () => {
  it("returns false when target is same path and query", () => {
    expect(
      shouldNavigateAfterTipperVerify(
        "/explore?tab=join&joinCommunity=abc",
        "/explore?tab=join&joinCommunity=abc"
      )
    ).toBe(false);
  });

  it("returns true when target differs", () => {
    expect(
      shouldNavigateAfterTipperVerify(
        "/explore?tab=feed",
        "/explore?tab=join&joinCommunity=abc"
      )
    ).toBe(true);
  });

  it("returns false for missing or unsafe target", () => {
    expect(shouldNavigateAfterTipperVerify(undefined, "/explore")).toBe(false);
    expect(shouldNavigateAfterTipperVerify("//evil.com", "/explore")).toBe(
      false
    );
  });
});
