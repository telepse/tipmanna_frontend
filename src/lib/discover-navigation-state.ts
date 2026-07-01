/**
 * Centralized Discover navigation model for the long-lived Explore session.
 *
 * This is the single source of truth for how the four Discover surfaces relate
 * to one another:
 *   - feed                (ExploreFeedClient reel)
 *   - discover-panel      (quick panel overlay above the feed)
 *   - discover-expanded   (full Discover tab / dedicated Discover page)
 *   - community
 *
 * The functions below describe transitions declaratively (the "what"); the
 * Explore page applies the resulting {@link DiscoverNavIntent} to React state
 * (the "how"). Keeping the rules here prevents the competing tab/sheet/URL
 * logic that previously caused navigation regressions.
 */

export type ExploreMainTab =
  | "feed"
  | "discover"
  | "community"
  | "my-communities"
  | "join";

/** A declarative description of a Discover navigation transition. */
export interface DiscoverNavIntent {
  /** Switch the main surface (omit to leave the current surface unchanged). */
  tab?: ExploreMainTab;
  /** Open the Discover quick panel overlay. */
  openPanel?: boolean;
  /** Close the Discover quick panel overlay. */
  closePanel?: boolean;
  /** Seed the Discover search term (omit to leave unchanged). */
  searchTerm?: string;
}

/**
 * Search activation. Unified navigation keeps the user on the feed and only
 * opens the quick panel over it; legacy behavior also expands to the full
 * Discover tab.
 */
export function searchIntent(
  term: string,
  unifiedNav: boolean
): DiscoverNavIntent {
  const q = term.trim();
  return {
    ...(q ? { searchTerm: q } : {}),
    ...(unifiedNav ? {} : { tab: "discover" }),
    openPanel: true,
  };
}

/**
 * Reel handoff: a standard video opened from anywhere in Discovery reveals the
 * feed and closes the quick panel so playback is unobstructed. The video itself
 * is opened in the existing ExploreFeedClient session by the caller.
 */
export function playInExploreIntent(): DiscoverNavIntent {
  return { tab: "feed", closePanel: true };
}

/**
 * "Open discover panel" from the expanded Discover tab. Under unified nav the
 * feed is revealed first so the panel overlays the feed (not the full Discover
 * page), which also guarantees a single DiscoverPanel instance is mounted.
 */
export function openPanelFromExpandedIntent(
  unifiedNav: boolean
): DiscoverNavIntent {
  return { ...(unifiedNav ? { tab: "feed" } : {}), openPanel: true };
}
