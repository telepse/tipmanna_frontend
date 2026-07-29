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
 * Product rule: when Explore playback is wired, every clip (including live
 * streams) opens in the long-lived ExploreFeedClient session. Legacy `/content`
 * and `/channel` navigation is disabled in the panel when a play handler exists.
 */
export function resolveDiscoverContentTarget(
  content: { liveStatus?: string | null },
  _surface: DiscoverSurface,
  hasPlayInExplore: boolean
): "channel" | "content" | "explore-reel" {
  if (hasPlayInExplore) return "explore-reel";
  if (isLiveStreamContent(content)) return "channel";
  return "content";
}
