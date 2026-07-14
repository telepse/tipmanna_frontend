import { describe, expect, it } from "vitest";

import {
  isCrawlerUserAgent,
  isExploreDiscoverSeoDeferralEnabled,
  shouldRenderExploreDiscoverSeoShell,
} from "../is-crawler-request";

describe("is-crawler-request", () => {
  it("detects Googlebot", () => {
    expect(isCrawlerUserAgent("Mozilla/5.0 Googlebot/2.1")).toBe(true);
  });

  it("rejects normal browsers", () => {
    expect(
      isCrawlerUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
      )
    ).toBe(false);
  });

  it("renders shell for all traffic when deferral flag is off", () => {
    expect(isExploreDiscoverSeoDeferralEnabled()).toBe(false);
    expect(
      shouldRenderExploreDiscoverSeoShell({
        tab: undefined,
        userAgent: "Chrome",
      })
    ).toBe(true);
  });

  it("gates human default traffic when deferral flag is on", () => {
    const prev = process.env.NEXT_PUBLIC_EXPLORE_DISCOVER_SEO_DEFERRAL_ENABLED;
    process.env.NEXT_PUBLIC_EXPLORE_DISCOVER_SEO_DEFERRAL_ENABLED = "true";
    try {
      expect(
        shouldRenderExploreDiscoverSeoShell({
          tab: undefined,
          userAgent: "Chrome",
        })
      ).toBe(false);
      expect(
        shouldRenderExploreDiscoverSeoShell({
          tab: "discover",
          userAgent: "Chrome",
        })
      ).toBe(true);
      expect(
        shouldRenderExploreDiscoverSeoShell({
          tab: undefined,
          userAgent: "Googlebot/2.1",
        })
      ).toBe(true);
    } finally {
      process.env.NEXT_PUBLIC_EXPLORE_DISCOVER_SEO_DEFERRAL_ENABLED = prev;
    }
  });
});
