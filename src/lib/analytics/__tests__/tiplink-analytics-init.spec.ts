import { afterEach, describe, expect, it, vi } from "vitest";

import { initTiplinkAnalyticsRuntime } from "../tiplink-analytics";

vi.mock("../../analytics-session", () => ({
  ensureAnalyticsSessionStorage: vi.fn(),
  getAnalyticsSessionId: vi.fn(() => "test-session"),
  getDeviceCategory: vi.fn(() => "desktop" as const),
}));

vi.mock("../../analytics-sdk/runtime", () => ({
  initAnalyticsSdkRuntime: vi.fn(),
}));

vi.mock("../../tvAnalytics", () => ({
  initTvAnalyticsRuntime: vi.fn(),
}));

vi.mock("../../analytics-sdk/surface-flags", () => ({
  isTiplinkSdkCollectionActive: vi.fn(),
}));

describe("initTiplinkAnalyticsRuntime", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses SDK runtime when tiplink v2 collection is active", async () => {
    const { ensureAnalyticsSessionStorage } = await import(
      "../../analytics-session"
    );
    const { initAnalyticsSdkRuntime } = await import(
      "../../analytics-sdk/runtime"
    );
    const { initTvAnalyticsRuntime } = await import("../../tvAnalytics");
    const { isTiplinkSdkCollectionActive } = await import(
      "../../analytics-sdk/surface-flags"
    );
    vi.mocked(isTiplinkSdkCollectionActive).mockReturnValue(true);

    initTiplinkAnalyticsRuntime();

    expect(ensureAnalyticsSessionStorage).toHaveBeenCalled();
    expect(initAnalyticsSdkRuntime).toHaveBeenCalled();
    expect(initTvAnalyticsRuntime).not.toHaveBeenCalled();
  });

  it("uses legacy tv runtime when tiplink v2 collection is off", async () => {
    const { initTvAnalyticsRuntime } = await import("../../tvAnalytics");
    const { initAnalyticsSdkRuntime } = await import(
      "../../analytics-sdk/runtime"
    );
    const { isTiplinkSdkCollectionActive } = await import(
      "../../analytics-sdk/surface-flags"
    );
    vi.mocked(isTiplinkSdkCollectionActive).mockReturnValue(false);

    initTiplinkAnalyticsRuntime();

    expect(initTvAnalyticsRuntime).toHaveBeenCalled();
    expect(initAnalyticsSdkRuntime).not.toHaveBeenCalled();
  });
});
