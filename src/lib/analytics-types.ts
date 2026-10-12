/** Mirrors backend PaymentSurface / DeviceCategory */
export type PaymentSurface =
  | "tv_looper"
  | "content_client"
  | "event_room"
  | "channel_client"
  | "homepage_preview"
  | "explore_feed"
  | "community_feed"
  | "community_tv_looper"
  | "community_room"
  | "tiplink"
  | "tv_fullscreen"
  | "community_featured_overlay"
  | "unknown";

/** TV analytics clip mode (reels / explore feed uses EXPLORE). */
export type TvAnalyticsClipMode = "GLOBAL" | "LOCAL" | "EXPLORE";

export type DeviceCategory = "mobile" | "desktop" | "unknown";
