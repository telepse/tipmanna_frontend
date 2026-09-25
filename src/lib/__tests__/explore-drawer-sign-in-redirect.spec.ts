import { describe, expect, it } from "vitest";

import { shouldNavigateAfterTipperVerify } from "../tipper-otp-redirect";

describe("explore drawer OTP redirect", () => {
  it("does not navigate when return path matches current Explore feed URL", () => {
    const current = "/explore?feedTab=trends";
    expect(shouldNavigateAfterTipperVerify(current, current)).toBe(false);
  });

  it("navigates when return path is join tab but user is on feed", () => {
    expect(
      shouldNavigateAfterTipperVerify(
        "/explore?tab=join&joinCommunity=c1",
        "/explore?feedTab=trends"
      )
    ).toBe(true);
  });
});
