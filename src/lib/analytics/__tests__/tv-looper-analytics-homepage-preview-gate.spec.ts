import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isTvSurfaceSdkCollectionActive,
  onVideoReadyEncounter,
  trackTvVideoEncounter,
} = vi.hoisted(() => ({
  isTvSurfaceSdkCollectionActive: vi.fn((_surface: string) => false as boolean),
  onVideoReadyEncounter: vi.fn(),
  trackTvVideoEncounter: vi.fn(),
}));

vi.mock("../../analytics-sdk/surface-flags", () => ({
  isTvSurfaceSdkCollectionActive: (surface: string) =>
    isTvSurfaceSdkCollectionActive(surface),
}));

vi.mock("../../analytics-sdk/tv-surface-playback", () => ({
  tvSurfacePlaybackFor: (surface: string) => {
    if (surface !== "homepage_preview") {
      throw new Error(`unexpected surface ${surface}`);
    }
    return {
      onVideoReadyEncounter,
      onPlayStart: vi.fn(),
      onVideoEnd: vi.fn(),
      watchSegment: vi.fn(),
      complete: vi.fn(),
    };
  },
}));

vi.mock("../../tvAnalytics", async importOriginal => {
  const orig = await importOriginal<typeof import("../../tvAnalytics")>();
  return {
    ...orig,
    trackTvVideoEncounter,
    flushTvAnalytics: vi.fn().mockResolvedValue(undefined),
    setTvAnalyticsContext: vi.fn(),
  };
});

import { trackTvLooperVideoEncounter } from "../tv-looper-analytics";

const ctx = {
  eventId: "evt-1",
  channelId: "ch-1",
  analyticsSurface: "homepage_preview" as const,
  communityId: null,
};

describe("tv-looper-analytics homepage_preview gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTvSurfaceSdkCollectionActive.mockReturnValue(false);
  });

  it("uses v1 tvAnalytics encounter when homepage_preview v2 gate is off", () => {
    isTvSurfaceSdkCollectionActive.mockImplementation(
      surface => surface === "homepage_preview" && false
    );

    trackTvLooperVideoEncounter(ctx, {
      mode: "GLOBAL",
      scheduleIndex: 0,
      scheduleItemId: "sched-1",
    });

    expect(trackTvVideoEncounter).toHaveBeenCalledWith(
      "tv-surface-homepage_preview",
      expect.objectContaining({ mode: "GLOBAL", scheduleIndex: 0 })
    );
    expect(onVideoReadyEncounter).not.toHaveBeenCalled();
  });

  it("uses homepage_preview SDK playback adapter when gate is on", () => {
    isTvSurfaceSdkCollectionActive.mockImplementation(
      surface => surface === "homepage_preview"
    );

    trackTvLooperVideoEncounter(ctx, {
      mode: "LOCAL",
      scheduleIndex: 2,
      scheduleItemId: "sched-2",
    });

    expect(onVideoReadyEncounter).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleItemId: "sched-2",
        scheduleIndex: 2,
        mode: "LOCAL",
        eventId: "evt-1",
        videoChannelId: "ch-1",
      })
    );
    expect(trackTvVideoEncounter).not.toHaveBeenCalled();
  });

  it("does not treat tv_looper gate as homepage_preview", () => {
    isTvSurfaceSdkCollectionActive.mockImplementation(
      surface => surface === "tv_looper"
    );

    trackTvLooperVideoEncounter(ctx, {
      mode: "GLOBAL",
      scheduleIndex: 0,
      scheduleItemId: "sched-1",
    });

    expect(onVideoReadyEncounter).not.toHaveBeenCalled();
    expect(trackTvVideoEncounter).toHaveBeenCalled();
  });
});
