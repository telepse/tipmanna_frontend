import { describe, expect, it } from "vitest";

import {
  PARTNER_PAGE_METADATA,
  resolvePartnerScrollTargetId,
} from "@/lib/partner-page-metadata";

describe("PARTNER_PAGE_METADATA", () => {
  it("uses a single canonical partner path", () => {
    expect(PARTNER_PAGE_METADATA.canonicalPath).toBe("/partner");
    expect(PARTNER_PAGE_METADATA.title.length).toBeGreaterThan(0);
    expect(PARTNER_PAGE_METADATA.description.length).toBeGreaterThan(0);
  });
});

describe("resolvePartnerScrollTargetId", () => {
  it("returns pricing target on partner pricing deep links", () => {
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

  it("returns null for non-partner paths or unrelated sections", () => {
    expect(
      resolvePartnerScrollTargetId({
        pathname: "/",
        section: "pricing",
      })
    ).toBeNull();
    expect(
      resolvePartnerScrollTargetId({
        pathname: "/partner",
        section: "other",
      })
    ).toBeNull();
  });
});
