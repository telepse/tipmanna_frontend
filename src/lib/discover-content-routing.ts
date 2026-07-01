export type DiscoverSurface = "discovery" | "exploreTab";

export function isLiveStreamContent(content: {
  liveStatus?: string | null;
}): boolean {
  const status = content.liveStatus;
  return status === "LIVE" || status === "ENDED" || status === "UPCOMING";
}

/**
 * Where a discover-panel card click should navigate.
 *
 * Product rule (architecture consolidation): standard videos clicked anywhere
 * in Discovery — quick panel, expanded Discover tab, or the dedicated Discover
 * page — always play inside the long-lived ExploreFeedClient session. The
 * `surface` is retained for callers/telemetry but no longer gates playback;
 * any surface that provides a play handler reuses Explore playback. Live
 * streams continue to open their dedicated channel destination.
 */
export function resolveDiscoverContentTarget(
  content: { liveStatus?: string | null },
  _surface: DiscoverSurface,
  hasPlayInExplore: boolean
): "channel" | "content" | "explore-reel" {
  if (isLiveStreamContent(content)) return "channel";
  if (hasPlayInExplore) return "explore-reel";
  return "content";
}
