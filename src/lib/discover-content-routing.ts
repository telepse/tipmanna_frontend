export type DiscoverSurface = "discovery" | "exploreTab" | "explorePanel";

export type LiveStatusHint = string | null | undefined;

export function isLivestreamFamily(content: {
  liveStatus?: LiveStatusHint;
  isLive?: boolean | null;
}): boolean {
  if (content.isLive === true) return true;
  const status = content.liveStatus;
  return status === "LIVE" || status === "UPCOMING" || status === "ENDED";
}

/** Live-now badge / cue (actively live or host-flagged without ended status). */
export function isLiveStreamContent(content: {
  liveStatus?: LiveStatusHint;
  isLive?: boolean | null;
}): boolean {
  if (content.liveStatus === "ENDED") return false;
  return content.isLive === true || content.liveStatus === "LIVE";
}

/** Scheduled or ended live streams that should not play in the explore reel from Discover. */
export function isNonReelLiveStatus(content: {
  liveStatus?: LiveStatusHint;
}): boolean {
  const status = content.liveStatus;
  return status === "UPCOMING" || status === "ENDED";
}

/** Discover clicks: LIVE, UPCOMING, ENDED, and host isLive → event-room channel. */
export function shouldOpenLiveInChannelClient(content: {
  liveStatus?: LiveStatusHint;
  isLive?: boolean | null;
}): boolean {
  return isLivestreamFamily(content);
}

/**
 * Explore handoff: redirect LIVE / UPCOMING / host isLive to channel.
 * ENDED items already in the reel (opt-in) stay in the reel.
 */
export function shouldOpenExploreHandoffInChannel(content: {
  liveStatus?: LiveStatusHint;
  isLive?: boolean | null;
}): boolean {
  if (content.isLive === true && content.liveStatus !== "ENDED") return true;
  const status = content.liveStatus;
  return status === "LIVE" || status === "UPCOMING";
}

/**
 * Where a discover-panel card click should navigate.
 *
 * Livestream-family rows always open in the channel client. Other clips use Explore
 * playback when a play handler is wired.
 */
export function resolveDiscoverContentTarget(
  content: { liveStatus?: LiveStatusHint; isLive?: boolean | null },
  _surface: DiscoverSurface,
  hasPlayInExplore: boolean
): "channel" | "content" | "explore-reel" {
  if (shouldOpenLiveInChannelClient(content)) return "channel";
  if (hasPlayInExplore) return "explore-reel";
  return "content";
}
