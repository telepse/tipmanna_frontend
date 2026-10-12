import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isExploreWatchDurationCollectionActive,
  isExploreFeedSdkCollectionActive,
} from "../surface-flags";
import { trackExploreFeedWatchDurationIfEnabled } from "../../analytics/explore-feed-analytics";

vi.mock("../../tvAnalytics", () => ({
  trackTvWatchDuration: vi.fn(),
}));

import { trackTvWatchDuration } from "../../tvAnalytics";

describe("Wave 4 explore duration flag", () => {
  const keys = [
    "NEXT_PUBLIC_ANALYTICS_EXPLORE_DURATION",
    "NEXT_PUBLIC_ANALYTICS_SDK_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_EXPLORE_FEED_V2",
  ] as const;

  const prev: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
    vi.clearAllMocks();
  });

  it("defaults off", () => {
    for (const k of keys) prev[k] = process.env[k];
    delete process.env.NEXT_PUBLIC_ANALYTICS_EXPLORE_DURATION;
    expect(isExploreWatchDurationCollectionActive()).toBe(false);
    expect(isExploreFeedSdkCollectionActive()).toBe(false);

    trackExploreFeedWatchDurationIfEnabled(
      {
        eventId: "e1",
        channelId: "ch1",
        communityId: null,
        analyticsSurface: "explore_feed",
      },
      { scheduleItemId: "explore-ch1", watchedSec: 5, channelId: "ch1" }
    );
    expect(trackTvWatchDuration).not.toHaveBeenCalled();
  });

  it("legacy path emits watch_duration when duration flag on (SDK off)", () => {
    for (const k of keys) prev[k] = process.env[k];
    process.env.NEXT_PUBLIC_ANALYTICS_EXPLORE_DURATION = "true";
    delete process.env.NEXT_PUBLIC_ANALYTICS_SDK_V2;

    trackExploreFeedWatchDurationIfEnabled(
      {
        eventId: "e1",
        channelId: "ch1",
        communityId: null,
        analyticsSurface: "explore_feed",
      },
      { scheduleItemId: "explore-ch1", watchedSec: 5, channelId: "ch1" }
    );
    expect(trackTvWatchDuration).toHaveBeenCalledWith(
      "explore-ch1",
      5,
      "EXPLORE",
      "ch1"
    );
  });
});
