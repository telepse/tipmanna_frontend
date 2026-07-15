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

  it("does not render shell for human default feed tab regardless of deferral flag", () => {
    expect(isExploreDiscoverSeoDeferralEnabled()).toBe(false);
    expect(
      shouldRenderExploreDiscoverSeoShell({
        tab: undefined,
        userAgent: "Chrome",
      })
    ).toBe(false);
  });

  it("renders shell for discover tab and crawlers", () => {
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
    expect(
      shouldRenderExploreDiscoverSeoShell({
        tab: undefined,
        userAgent: "Chrome",
      })
    ).toBe(false);
  });
});
