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
  const stateHref = exploreHrefForState(
    pathBase,
    tabCtx,
    feedState,
    searchParamsKey
  );
  const curHref = exploreCurrentHref(pathBase, searchParamsKey);
  return stateHref !== curHref;
}
