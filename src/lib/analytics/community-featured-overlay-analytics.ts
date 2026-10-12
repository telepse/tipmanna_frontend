import { getAnalyticsSessionId, getDeviceCategory } from "../analytics-session";
import { flushSdkAnalytics } from "../analytics-sdk/transport";
import { setAnalyticsSdkRuntimeContext } from "../analytics-sdk/runtime";
import { isCommunityFeaturedOverlaySdkCollectionActive } from "../analytics-sdk/surface-flags";
import type { PaymentSurface } from "../analytics-types";

/** Content overlay surface when SDK collection is active; else legacy content_client. */
export function communityFeaturedOverlayPaymentSurface(): PaymentSurface {
  return isCommunityFeaturedOverlaySdkCollectionActive()
    ? "community_featured_overlay"
    : "content_client";
}

/** No legacy producer — no-op when flag off (zero KPI delta). */
export function trackCommunityFeaturedOverlayOpen(params: {
  eventId: string;
  channelId: string;
  communityId: string | null;
}): void {
  if (!isCommunityFeaturedOverlaySdkCollectionActive()) return;

  const sdkCtx = {
    sessionId: getAnalyticsSessionId(),
    surface: "community_featured_overlay" as const,
    eventId: params.eventId,
    videoChannelId: params.channelId,
    deviceCategory: getDeviceCategory(),
    ...(params.communityId ? { communityId: params.communityId } : {}),
  };

  void flushSdkAnalytics({ ctx: sdkCtx, auth: {} }).then(() => {
    setAnalyticsSdkRuntimeContext(sdkCtx);
  });
}
