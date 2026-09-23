import { describe, expect, it } from "vitest";

import { formatTipLinkAttribution } from "@/lib/tiplink-attribution";

describe("formatTipLinkAttribution", () => {
  it("uses host first name when there is no community or co-owner", () => {
    expect(
      formatTipLinkAttribution({ hostFirstName: "Ada", communityName: null })
    ).toBe("Ada");
  });

  it("uses community name when present", () => {
    expect(
      formatTipLinkAttribution({
        hostFirstName: "Ada",
        communityName: "Northside Choir",
      })
    ).toBe("Northside Choir");
  });

  it("appends approved co-owner unique name after host", () => {
    expect(
      formatTipLinkAttribution({
        hostFirstName: "Ada",
        coOwnerName: "Alex Creator",
      })
    ).toBe("Ada and Alex Creator");
  });

  it("appends approved co-owner unique name after community", () => {
    expect(
      formatTipLinkAttribution({
        hostFirstName: "Ada",
        communityName: "Northside Choir",
        coOwnerName: "Alex Creator",
      })
    ).toBe("Northside Choir and Alex Creator");
  });
});
