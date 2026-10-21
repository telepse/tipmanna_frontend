import { afterEach, describe, expect, it } from "vitest";

import {
  isChannelClientSdkCollectionActive,
  isCommunityFeaturedOverlaySdkCollectionActive,
  isCommunityFeedSdkCollectionActive,
  isContentClientSdkCollectionActive,
  isEventRoomSdkCollectionActive,
  isExploreFeedSdkCollectionActive,
  isHomepagePreviewAnalyticsV2Enabled,
  isTiplinkSdkCollectionActive,
  isTvFullscreenSdkCollectionActive,
  isTvSurfaceSdkCollectionActive,
} from "../surface-flags";

describe("Wave 3 surface flags default off", () => {
  const keys = [
    "NEXT_PUBLIC_ANALYTICS_SDK_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_EVENT_ROOM_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_CHANNEL_CLIENT_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_TV_LOOPER_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_TV_LOOPER_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_HOMEPAGE_PREVIEW_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_TV_FULLSCREEN_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_FEATURED_OVERLAY_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_EXPLORE_FEED_V2",
    "NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_FEED_V2",
  ] as const;

  const prev: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  it("requires master SDK and surface flag", () => {
    for (const k of keys) prev[k] = process.env[k];
    delete process.env.NEXT_PUBLIC_ANALYTICS_SDK_V2;
    delete process.env.NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2;
    expect(isContentClientSdkCollectionActive()).toBe(false);

    process.env.NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2 = "true";
    expect(isContentClientSdkCollectionActive()).toBe(false);

    process.env.NEXT_PUBLIC_ANALYTICS_SDK_V2 = "true";
    expect(isContentClientSdkCollectionActive()).toBe(true);
    expect(isEventRoomSdkCollectionActive()).toBe(false);
    expect(isTiplinkSdkCollectionActive()).toBe(false);
  });

  it("each surface requires its own flag when SDK master is on", () => {
    for (const k of keys) prev[k] = process.env[k];
    process.env.NEXT_PUBLIC_ANALYTICS_SDK_V2 = "true";
    for (const k of keys) {
      if (k === "NEXT_PUBLIC_ANALYTICS_SDK_V2") continue;
      delete process.env[k];
    }

    expect(isContentClientSdkCollectionActive()).toBe(false);
    expect(isEventRoomSdkCollectionActive()).toBe(false);
    expect(isChannelClientSdkCollectionActive()).toBe(false);
    expect(isTvSurfaceSdkCollectionActive("tv_looper")).toBe(false);
    expect(isTvSurfaceSdkCollectionActive("community_tv_looper")).toBe(false);
    expect(isHomepagePreviewAnalyticsV2Enabled()).toBe(false);
    expect(isTvFullscreenSdkCollectionActive()).toBe(false);
    expect(isCommunityFeaturedOverlaySdkCollectionActive()).toBe(false);
    expect(isExploreFeedSdkCollectionActive()).toBe(false);
    expect(isCommunityFeedSdkCollectionActive()).toBe(false);

    process.env.NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2 = "true";
    expect(isContentClientSdkCollectionActive()).toBe(true);
    expect(isEventRoomSdkCollectionActive()).toBe(false);

    process.env.NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2 = "false";
    expect(isContentClientSdkCollectionActive()).toBe(false);
  });
});
