import type { PaymentSurface } from "../analytics-types";
import { isAnalyticsSdkEnabled } from "./flags";

function readSurfaceFlag(envKey: string): boolean {
  if (typeof process === "undefined") return false;
  return process.env[envKey] === "true";
}

/** Staging pilot: channel_client canonical producer (default off). */
export function isChannelClientAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_CHANNEL_CLIENT_V2");
}

export function isContentClientAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_CONTENT_CLIENT_V2");
}

export function isEventRoomAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_EVENT_ROOM_V2");
}

export function isTiplinkAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_TIPLINK_V2");
}

export function isTvLooperAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_TV_LOOPER_V2");
}

export function isCommunityTvLooperAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag(
    "NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_TV_LOOPER_V2"
  );
}

export function isHomepagePreviewAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_HOMEPAGE_PREVIEW_V2");
}

export function isTvFullscreenAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_TV_FULLSCREEN_V2");
}

export function isCommunityFeaturedOverlayAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag(
    "NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_FEATURED_OVERLAY_V2"
  );
}

export function isTvFullscreenSdkCollectionActive(): boolean {
  return isAnalyticsSdkEnabled() && isTvFullscreenAnalyticsV2Enabled();
}

export function isCommunityFeaturedOverlaySdkCollectionActive(): boolean {
  return (
    isAnalyticsSdkEnabled() && isCommunityFeaturedOverlayAnalyticsV2Enabled()
  );
}

export function isExploreFeedAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_EXPLORE_FEED_V2");
}

export function isCommunityFeedAnalyticsV2Enabled(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_SURFACE_COMMUNITY_FEED_V2");
}

export function isExploreFeedSdkCollectionActive(): boolean {
  return isAnalyticsSdkEnabled() && isExploreFeedAnalyticsV2Enabled();
}

export function isCommunityFeedSdkCollectionActive(): boolean {
  return isAnalyticsSdkEnabled() && isCommunityFeedAnalyticsV2Enabled();
}

/** Wave 4 — explore watch_duration producer (default off; P2-0 legacy views fence). */
export function isExploreWatchDurationCollectionActive(): boolean {
  return readSurfaceFlag("NEXT_PUBLIC_ANALYTICS_EXPLORE_DURATION");
}

export function isExplorePlaybackSdkCollectionActive(
  surface: PaymentSurface
): boolean {
  if (!isAnalyticsSdkEnabled()) return false;
  if (surface === "community_feed") {
    return isCommunityFeedAnalyticsV2Enabled();
  }
  if (surface === "explore_feed") {
    return isExploreFeedAnalyticsV2Enabled();
  }
  return false;
}

/** TV looper surfaces wired through tv-looper / home-tv-looper adapters. */
export function isTvSurfaceSdkCollectionActive(
  surface: PaymentSurface
): boolean {
  if (!isAnalyticsSdkEnabled()) return false;
  switch (surface) {
    case "tv_looper":
      return isTvLooperAnalyticsV2Enabled();
    case "community_tv_looper":
      return isCommunityTvLooperAnalyticsV2Enabled();
    case "homepage_preview":
      return isHomepagePreviewAnalyticsV2Enabled();
    default:
      return false;
  }
}

/** Both master SDK and surface flag required for v2 collection. */
export function isChannelClientSdkCollectionActive(): boolean {
  return isAnalyticsSdkEnabled() && isChannelClientAnalyticsV2Enabled();
}

export function isContentClientSdkCollectionActive(): boolean {
  return isAnalyticsSdkEnabled() && isContentClientAnalyticsV2Enabled();
}

export function isEventRoomSdkCollectionActive(): boolean {
  return isAnalyticsSdkEnabled() && isEventRoomAnalyticsV2Enabled();
}

export function isTiplinkSdkCollectionActive(): boolean {
  return isAnalyticsSdkEnabled() && isTiplinkAnalyticsV2Enabled();
}
