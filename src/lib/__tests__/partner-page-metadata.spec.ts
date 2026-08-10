import { describe, expect, it } from "vitest";

import {
  resolvePartnerMetadataVariant,
  resolvePartnerScrollTargetId,
} from "@/lib/partner-page-metadata";

describe("resolvePartnerMetadataVariant", () => {
  it("selects pricing for section or hash", () => {
    expect(resolvePartnerMetadataVariant({ section: "pricing" })).toBe(
      "pricing"
    );
    expect(resolvePartnerMetadataVariant({ hash: "#pricing" })).toBe("pricing");
    expect(resolvePartnerMetadataVariant({ section: "other" })).toBe("default");
  });
});

describe("resolvePartnerScrollTargetId", () => {
  it("returns pricing id on partner page when section or hash requests pricing", () => {
    expect(
      resolvePartnerScrollTargetId({
        pathname: "/partner",
        section: "pricing",
      })
    ).toBe("pricing");
    expect(
      resolvePartnerScrollTargetId({
        pathname: "/partner",
        hash: "#pricing",
      })
    ).toBe("pricing");
  });

  it("returns null on other routes or default partner view", () => {
    expect(
      resolvePartnerScrollTargetId({
        pathname: "/",
        section: "pricing",
      })
    ).toBeNull();
    expect(
      resolvePartnerScrollTargetId({
        pathname: "/partner",
        section: null,
      })
    ).toBeNull();
  });
});
