import { afterEach, describe, expect, it, vi } from "vitest";

import { initHomepagePreviewAnalyticsRuntime } from "../homepage-preview-analytics";

vi.mock("../../analytics-session", () => ({
  ensureAnalyticsSessionStorage: vi.fn(),
}));

vi.mock("../../analytics-sdk/runtime", () => ({
  initAnalyticsSdkRuntime: vi.fn(),
}));

vi.mock("../../tvAnalytics", () => ({
  initTvAnalyticsRuntime: vi.fn(),
}));

vi.mock("../../analytics-sdk/surface-flags", () => ({
  isTvSurfaceSdkCollectionActive: vi.fn(),
}));

vi.mock("../../analytics-sdk/flags", () => ({
  isAnalyticsSdkEnabled: vi.fn(() => true),
}));

describe("initHomepagePreviewAnalyticsRuntime", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses SDK runtime when homepage_preview v2 collection is active (incl. partner pilot)", async () => {
    const { ensureAnalyticsSessionStorage } = await import(
      "../../analytics-session"
    );
    const { initAnalyticsSdkRuntime } = await import(
      "../../analytics-sdk/runtime"
    );
    const { initTvAnalyticsRuntime } = await import("../../tvAnalytics");
    const { isTvSurfaceSdkCollectionActive } = await import(
      "../../analytics-sdk/surface-flags"
    );
    vi.mocked(isTvSurfaceSdkCollectionActive).mockReturnValue(true);

    initHomepagePreviewAnalyticsRuntime();

    expect(ensureAnalyticsSessionStorage).toHaveBeenCalled();
    expect(initAnalyticsSdkRuntime).toHaveBeenCalled();
    expect(initTvAnalyticsRuntime).not.toHaveBeenCalled();
  });
});
