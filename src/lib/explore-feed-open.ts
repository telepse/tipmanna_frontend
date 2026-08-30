/**
 * Explore feed: open a specific channel in-reel (Discover → Feed).
 * videoId = EventChannel / content row id (Discover card `content.id`).
 */
export type ExploreFeedOpenTarget = {
  videoId: string;
  eventId: string;
  /**
   * Full channel row from Discover (featured/latest/tipped lists). Avoids a second
   * GET /contents/channel/:eventId that may return `restricted` stubs without `url`
   * when the viewer/session differs from the list endpoint.
   */
  channelSnapshot?: Record<string, unknown>;
  /** When opened from Discover, channel back chip should restore this URL. */
  discoverReturnTo?: string;
  discoverReturnLabel?: string;
};

export function getExploreSlideStepPx(scrollRoot: HTMLElement): number {
  const slide = scrollRoot.querySelector(
    "[data-explore-slide]"
  ) as HTMLElement | null;
  const h = slide?.getBoundingClientRect().height ?? 0;
  return h > 0 ? h : scrollRoot.clientHeight;
}

/** Derive the active reel index from scroll position (pagination near-end source of truth). */
export function resolveExploreFeedScrollIndex(
  scrollRoot: HTMLElement | null,
  itemCount: number,
  fallbackIndex = 0
): number {
  if (!scrollRoot || itemCount <= 0) return fallbackIndex;
  const h = getExploreSlideStepPx(scrollRoot);
  if (h <= 0) return fallbackIndex;
  return Math.min(
    itemCount - 1,
    Math.max(0, Math.round(scrollRoot.scrollTop / h))
  );
}

export function buildExploreFeedOpenTarget(args: {
  content: { id: string; event?: { id?: string } | null };
  channelSnapshot?: Record<string, unknown>;
  discoverReturnTo?: string;
  discoverReturnLabel?: string;
}): ExploreFeedOpenTarget | null {
  const eventId = args.content.event?.id?.trim();
  if (!eventId) return null;
  return {
    videoId: args.content.id,
    eventId,
    ...(args.channelSnapshot ? { channelSnapshot: args.channelSnapshot } : {}),
    ...(args.discoverReturnTo ? { discoverReturnTo: args.discoverReturnTo } : {}),
    ...(args.discoverReturnLabel
      ? { discoverReturnLabel: args.discoverReturnLabel }
      : {}),
  };
}

export function scrollExploreFeedToIndex(
  scrollRoot: HTMLElement,
  index: number,
  behavior: ScrollBehavior = "auto"
): void {
  const h = getExploreSlideStepPx(scrollRoot);
  if (h <= 0) return;
  scrollRoot.scrollTo({ top: Math.max(0, index) * h, behavior });
}
