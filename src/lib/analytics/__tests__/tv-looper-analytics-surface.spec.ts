import { beforeEach, describe, expect, it, vi } from "vitest";

const { setTvAnalyticsContext, flushSdkAnalytics, flushTvAnalytics } =
  vi.hoisted(() => ({
    setTvAnalyticsContext: vi.fn(),
    flushSdkAnalytics: vi.fn().mockResolvedValue(undefined),
    flushTvAnalytics: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock("../../analytics-sdk/surface-flags", () => ({
  isTvSurfaceSdkCollectionActive: (surface: string) =>
    surface === "community_tv_looper" || surface === "tv_fullscreen",
}));

vi.mock("../../tvAnalytics", async importOriginal => {
  const orig = await importOriginal<typeof import("../../tvAnalytics")>();
  return {
    ...orig,
    setTvAnalyticsContext,
    flushTvAnalytics,
  };
});

vi.mock("../../analytics-sdk/transport", () => ({
  flushSdkAnalytics,
}));

vi.mock("../../analytics-sdk/runtime", () => ({
  setAnalyticsSdkRuntimeContext: vi.fn(),
}));

vi.mock("../../analytics-session", () => ({
  getAnalyticsSessionId: () => "sess-test",
  getDeviceCategory: () => "desktop",
}));

import {
  resolveLooperEffectiveAnalyticsSurface,
  syncTvLooperAnalyticsContext,
} from "../tv-looper-analytics";

describe("resolveLooperEffectiveAnalyticsSurface", () => {
  it("maps global looper immersive chrome to tv_fullscreen", () => {
    expect(
      resolveLooperEffectiveAnalyticsSurface("tv_looper", { immersive: true })
    ).toBe("tv_fullscreen");
  });

  it("keeps community_tv_looper when immersive", () => {
    expect(
      resolveLooperEffectiveAnalyticsSurface("community_tv_looper", {
        immersive: true,
      })
    ).toBe("community_tv_looper");
  });

  it("keeps tv_looper when not immersive", () => {
    expect(
      resolveLooperEffectiveAnalyticsSurface("tv_looper", { immersive: false })
    ).toBe("tv_looper");
  });
});

describe("syncTvLooperAnalyticsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always sets legacy v1 context surface before v2 SDK sync", async () => {
    await syncTvLooperAnalyticsContext({
      eventId: "evt-1",
      channelId: "ch-1",
      analyticsSurface: "community_tv_looper",
      communityId: "comm-1",
    });

    expect(setTvAnalyticsContext).toHaveBeenCalledWith(
      expect.objectContaining({ surface: "community_tv_looper" })
    );
    expect(flushSdkAnalytics).toHaveBeenCalled();
  });
});
