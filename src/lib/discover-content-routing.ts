export type DiscoverSurface = "discovery" | "exploreTab";

export function isLiveStreamContent(content: {
  liveStatus?: string | null;
}): boolean {
  const status = content.liveStatus;
  return status === "LIVE" || status === "ENDED" || status === "UPCOMING";
}

/** Where a discover-panel card click should navigate. */
export function resolveDiscoverContentTarget(
  content: { liveStatus?: string | null },
  surface: DiscoverSurface,
  hasPlayInExplore: boolean
): "channel" | "content" | "explore-reel" {
  if (isLiveStreamContent(content)) return "channel";
  if (surface === "exploreTab" && hasPlayInExplore) return "explore-reel";
  return "content";
}
