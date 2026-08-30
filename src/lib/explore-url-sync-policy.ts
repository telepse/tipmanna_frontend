import {
  buildExploreFeedHref,
  type ExploreFeedUrlState,
  type ExploreFeedUrlTabContext,
} from "@/lib/explore-url-feed-state";

/** Build the canonical Explore href for the current path + tab + feed shell state. */
export function exploreHrefForState(
  pathBase: string,
  tabCtx: ExploreFeedUrlTabContext,
  feedState: ExploreFeedUrlState,
  existingSearchParamsKey: string
): string {
  return buildExploreFeedHref(
    pathBase,
    tabCtx,
    feedState,
    existingSearchParamsKey
  );
}

export function exploreCurrentHref(
  pathBase: string,
  searchParamsKey: string
): string {
  return `${pathBase}${searchParamsKey ? `?${searchParamsKey}` : ""}`;
}

/** Prefer live browser query string on the client; fall back to React searchParams. */
export function exploreLiveSearchParamsKey(searchParamsKey: string): string {
  if (typeof window !== "undefined") {
    return window.location.search.replace(/^\?/, "");
  }
  return searchParamsKey;
}

/** Compare Explore hrefs by pathname + decoded query keys (order-independent). */
export function exploreHrefsEqual(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    const au = new URL(a, "http://explore.local");
    const bu = new URL(b, "http://explore.local");
    if (au.pathname !== bu.pathname) return false;
    const ap = new URLSearchParams(au.search);
    const bp = new URLSearchParams(bu.search);
    if (ap.size !== bp.size) return false;
    for (const [key, value] of ap.entries()) {
      if (bp.get(key) !== value) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** True when the live URL lacks an explicit feedTab (bare /explore feed shell). */
export function exploreNeedsFeedTabBootstrap(searchParamsKey: string): boolean {
  const liveKey = exploreLiveSearchParamsKey(searchParamsKey);
  return !new URLSearchParams(liveKey).has("feedTab");
}

/**
 * True when React state intentionally diverges from the browser URL and the URL
 * should be updated (state → URL push), not restored from URL.
 */
export function exploreStateAheadOfUrl(
  pathBase: string,
  tabCtx: ExploreFeedUrlTabContext,
  feedState: ExploreFeedUrlState,
  searchParamsKey: string
): boolean {
  const liveKey = exploreLiveSearchParamsKey(searchParamsKey);
  const stateHref = exploreHrefForState(pathBase, tabCtx, feedState, liveKey);
  const curHref = exploreCurrentHref(pathBase, liveKey);
  return !exploreHrefsEqual(stateHref, curHref);
}
