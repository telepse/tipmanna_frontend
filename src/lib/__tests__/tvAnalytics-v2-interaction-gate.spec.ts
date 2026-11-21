import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../analytics-sdk/surface-flags", () => ({
  isTvSurfaceSdkCollectionActive: (surface: string) =>
    surface === "tv_looper",
}));

const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
vi.stubGlobal("fetch", fetchMock);

import {
  setTvAnalyticsContext,
  trackTvModeChange,
  trackTvUserInteraction,
} from "../tvAnalytics";

describe("tvAnalytics v1 interaction gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_TV_ANALYTICS_ENABLED = "true";
    process.env.NEXT_PUBLIC_BACKEND_API_URL = "https://api.test";
    setTvAnalyticsContext({
      eventId: "e1",
      channelId: "c1",
      surface: "tv_looper",
      communityId: null,
    });
  });

  it("skips v1 pause/mode_change when v2 TV surface collection is active", async () => {
    trackTvUserInteraction("pause", null);
    trackTvModeChange("GLOBAL", "LOCAL", "pause");
    const { flushTvAnalytics } = await import("../tvAnalytics");
    await flushTvAnalytics();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
