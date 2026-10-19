import { describe, expect, it } from "vitest";

import { PARTNER_HOMEPAGE_TOTAL_ENCOUNTERS_LABEL } from "@/lib/partner-homepage-public-copy";

describe("partner homepage public copy (P1 Option B)", () => {
  it("does not use TV-only wording for platform-wide encounter totals", () => {
    expect(PARTNER_HOMEPAGE_TOTAL_ENCOUNTERS_LABEL).not.toMatch(/TV/i);
    expect(PARTNER_HOMEPAGE_TOTAL_ENCOUNTERS_LABEL).toBe(
      "Platform content plays"
    );
  });
});
