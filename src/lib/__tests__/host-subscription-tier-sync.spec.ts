import { describe, expect, it } from "vitest";

import { shouldDispatchHostSubscriptionTier } from "@/lib/host-subscription-tier-sync";

describe("shouldDispatchHostSubscriptionTier", () => {
  it("dispatches when tier was missing and next is set", () => {
    expect(shouldDispatchHostSubscriptionTier(undefined, "HOST_PREMIUM")).toBe(
      true
    );
  });

  it("does not dispatch when tier is unchanged", () => {
    expect(
      shouldDispatchHostSubscriptionTier("HOST_PREMIUM", "HOST_PREMIUM")
    ).toBe(false);
  });

  it("dispatches when tier changes", () => {
    expect(
      shouldDispatchHostSubscriptionTier("HOST_PREMIUM", "HOST_COMMUNITY")
    ).toBe(true);
  });

  it("dispatches when clearing to undefined", () => {
    expect(shouldDispatchHostSubscriptionTier("HOST_PREMIUM", undefined)).toBe(
      true
    );
  });
});
