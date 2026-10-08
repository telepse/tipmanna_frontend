import { isAnalyticsSdkEnabled } from "./flags";

/** Staging pilot: channel_client canonical producer (default off). */
export function isChannelClientAnalyticsV2Enabled(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.NEXT_PUBLIC_ANALYTICS_SURFACE_CHANNEL_CLIENT_V2 === "true";
}

/** Both master SDK and surface flag required for v2 collection. */
export function isChannelClientSdkCollectionActive(): boolean {
  return isAnalyticsSdkEnabled() && isChannelClientAnalyticsV2Enabled();
}
