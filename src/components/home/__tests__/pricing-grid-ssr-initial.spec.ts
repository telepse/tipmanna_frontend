import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildMarketingPricingCards } from "@/lib/public-plan-pricing";

describe("NewPricingGrid SSR initialCards", () => {
  const gridSrc = fs.readFileSync(
    path.join(__dirname, "../pricing-grid.tsx"),
    "utf8"
  );
  const partnerSrc = fs.readFileSync(
    path.join(__dirname, "../../../app/partner/page.tsx"),
    "utf8"
  );

  it("accepts initialCards and skips getPlanPricingAction when provided", () => {
    expect(gridSrc).toMatch(/initialCards\?:/);
    expect(gridSrc).toMatch(/if \(initialCards !== undefined\) return;/);
    expect(gridSrc).toMatch(/getPlanPricingAction\(\)/);
  });

  it("partner page passes SSR marketingPricing into NewPricingGrid", () => {
    expect(partnerSrc).toMatch(
      /<NewPricingGrid\s+initialCards=\{marketingPricing\}\s*\/>/
    );
    expect(partnerSrc).toMatch(/getPlanPricingAction\(\)/);
    expect(partnerSrc).toMatch(/buildMarketingPricingCards/);
  });

  it("SSR marketing cards remain renderable (prices intact)", () => {
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
    expect(cards.map(c => c.tier)).toEqual(["free", "premium", "community"]);
    expect(cards.find(c => c.tier === "premium")?.price).toBe("£29.99");
  });
});
