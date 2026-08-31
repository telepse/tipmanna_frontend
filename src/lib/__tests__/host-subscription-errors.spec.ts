import { describe, expect, it } from "vitest";

import {
  isSubscriptionLapsedError,
  isSubscriptionRequiredError,
} from "@/lib/host-subscription-errors";

describe("host subscription action errors", () => {
  it("detects SUBSCRIPTION_LAPSED", () => {
    expect(
      isSubscriptionLapsedError({ error: { code: "SUBSCRIPTION_LAPSED" } })
    ).toBe(true);
    expect(
      isSubscriptionRequiredError({ error: { code: "SUBSCRIPTION_LAPSED" } })
    ).toBe(false);
  });

  it("detects SUBSCRIPTION_REQUIRED", () => {
    expect(
      isSubscriptionRequiredError({ error: { code: "SUBSCRIPTION_REQUIRED" } })
    ).toBe(true);
    expect(
      isSubscriptionLapsedError({ error: { code: "SUBSCRIPTION_REQUIRED" } })
    ).toBe(false);
  });
});
