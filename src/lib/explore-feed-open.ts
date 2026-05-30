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
};

export function getExploreSlideStepPx(scrollRoot: HTMLElement): number {
  const slide = scrollRoot.querySelector(
    "[data-explore-slide]"
  ) as HTMLElement | null;
  const h = slide?.getBoundingClientRect().height ?? 0;
  return h > 0 ? h : scrollRoot.clientHeight;
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
