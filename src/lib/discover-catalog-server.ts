import { cache } from "react";

import {
  getAllFeaturedContentsAction,
  getDiscoveryProgramsAction,
  getDiscoverPanelLatestContents,
  getLiveStreamContents,
  getMostTippedContents,
  getRecommendedContents,
  getSpotlightContents,
  getDiscoveryEventsAction,
} from "@/actions/contents";
import { getDiscoveryPlaylistsAction } from "@/actions/host-playlist";
import { getTopCommunitiesAction } from "@/actions/communities";
import { getAllTopTippers } from "@/actions/events";
import { normalizeListPayload } from "@/lib/list-response-normalizer";
import { takeRecentDiscoveryPrograms } from "@/lib/discover-programs";

export type DiscoverCatalog = {
  contents: unknown[];
  latest: unknown[];
  spotlight: unknown[];
  recommended: unknown[];
  mostTipped: unknown[];
  programs: unknown[];
  liveStreams: {
    upcoming: unknown[];
    live: unknown[];
    recentlyEnded: unknown[];
  };
  tippers: unknown[];
  topCommunities: unknown[];
  playlists: unknown[];
  discoverEvents: unknown[];
};

/** Fail-open cap when Discover catalog fetch runs on the SSR path. */
export const DISCOVER_CATALOG_FETCH_TIMEOUT_MS = 5000;

async function fetchDiscoverCatalog(): Promise<DiscoverCatalog> {
  const [
    feat,
    lat,
    spot,
    rec,
    most,
    liveRes,
    progRes,
    tipRes,
    commRes,
    plRes,
    eventsRes,
  ] = await Promise.all([
    getAllFeaturedContentsAction(),
    getDiscoverPanelLatestContents(),
    getSpotlightContents(),
    getRecommendedContents(),
    getMostTippedContents(),
    getLiveStreamContents(),
    getDiscoveryProgramsAction(),
    getAllTopTippers(),
    getTopCommunitiesAction(3),
    getDiscoveryPlaylistsAction(20),
    getDiscoveryEventsAction(),
  ]);

  const liveData =
    liveRes.success && liveRes.data && typeof liveRes.data === "object"
      ? (liveRes.data as {
          upcoming?: unknown[];
          live?: unknown[];
          recentlyEnded?: unknown[];
        })
      : null;

  return {
    contents: normalizeListPayload(feat.data),
    latest: normalizeListPayload(lat.data),
    spotlight: normalizeListPayload(spot.data),
    recommended: normalizeListPayload(rec.data),
    mostTipped: normalizeListPayload(most.data),
    programs: takeRecentDiscoveryPrograms(normalizeListPayload(progRes.data)),
    liveStreams: {
      upcoming: Array.isArray(liveData?.upcoming) ? liveData!.upcoming : [],
      live: Array.isArray(liveData?.live) ? liveData!.live : [],
      recentlyEnded: Array.isArray(liveData?.recentlyEnded)
        ? liveData!.recentlyEnded
        : [],
    },
    tippers: normalizeListPayload(tipRes.data),
    topCommunities:
      commRes.success && Array.isArray(commRes.data?.communities)
        ? commRes.data.communities
        : [],
    playlists: plRes.success && Array.isArray(plRes.data) ? plRes.data : [],
    discoverEvents:
      eventsRes.success && Array.isArray(eventsRes.data) ? eventsRes.data : [],
  };
}

/** Per-request dedup when multiple server callers load the catalog in one render. */
export const loadDiscoverCatalogServer = cache(fetchDiscoverCatalog);

export async function loadDiscoverCatalogServerWithTimeout(): Promise<DiscoverCatalog | null> {
  try {
    const result = await Promise.race([
      loadDiscoverCatalogServer(),
      new Promise<null>(resolve => {
        setTimeout(() => resolve(null), DISCOVER_CATALOG_FETCH_TIMEOUT_MS);
      }),
    ]);
    return result;
  } catch {
    return null;
  }
}
