export type DiscoverSurface = "discovery" | "exploreTab";

export function isLiveStreamContent(content: {
  liveStatus?: string | null;
}): boolean {
  return content.liveStatus === "LIVE";
}

/** Scheduled or ended live streams that should not play in the explore reel. */
export function isNonReelLiveStatus(content: {
  liveStatus?: string | null;
}): boolean {
  const status = content.liveStatus;
  return status === "UPCOMING" || status === "ENDED";
}

/**
 * Where a discover-panel card click should navigate.
 *
 * Live streams always open in the channel client. Other clips use Explore
 * playback when a play handler is wired.
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
