import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isExploreDiscoverSeoDeferralEnabled,
  isExploreTvPrefetchAfterStableEnabled,
} from "../explore-feature-flags";

describe("explore feature flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("discover SEO deferral is disabled by default", () => {
    expect(isExploreDiscoverSeoDeferralEnabled()).toBe(false);
  });

  it("TV prefetch after stable is disabled by default", () => {
    expect(isExploreTvPrefetchAfterStableEnabled()).toBe(false);
  });

  it("flags enable when env is true", () => {
    vi.stubEnv("NEXT_PUBLIC_EXPLORE_DISCOVER_SEO_DEFERRAL_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_EXPLORE_TV_PREFETCH_AFTER_STABLE_ENABLED", "true");
    expect(isExploreDiscoverSeoDeferralEnabled()).toBe(true);
    expect(isExploreTvPrefetchAfterStableEnabled()).toBe(true);
  });
});
