import { describe, expect, it } from "vitest";

import { buildMarketingPricingCards } from "@/lib/public-plan-pricing";

describe("buildMarketingPricingCards", () => {
  it("shows list prices when no discount is active", () => {
    const cards = buildMarketingPricingCards({
      premium: {
        listMinor: 2999,
        saleMinor: 2999,
        percentOff: 0,
        stripeCouponId: null,
      },
      community: {
        listMinor: 9999,
        saleMinor: 9999,
        percentOff: 0,
        stripeCouponId: null,
      },
      discountActive: false,
    });

    expect(cards.find(c => c.tier === "premium")?.price).toBe("£29.99");
    expect(cards.find(c => c.tier === "community")?.price).toBe("£99.99");
    expect(cards.find(c => c.tier === "premium")?.discountPrice).toBeUndefined();
  });

  it("shows sale and strikethrough list when discount is active", () => {
    const cards = buildMarketingPricingCards({
      premium: {
        listMinor: 2999,
        saleMinor: 1499,
        percentOff: 50,
        stripeCouponId: "coupon_test",
      },
      community: {
        listMinor: 9999,
        saleMinor: 4999,
        percentOff: 50,
        stripeCouponId: "coupon_test",
      },
      discountActive: true,
    });

    expect(cards.find(c => c.tier === "premium")?.price).toBe("£14.99");
    expect(cards.find(c => c.tier === "premium")?.discountPrice).toBe("£29.99");
  });
});
