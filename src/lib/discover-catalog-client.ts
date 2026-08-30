import {
  getAllFeaturedContentsAction,
  getDiscoveryProgramsAction,
  getDiscoverPanelLatestContents,
  getLiveStreamContents,
  getMostTippedContents,
  getSpotlightContents,
  getRecommendedContents,
} from "@/actions/contents";
import { getDiscoveryPlaylistsAction } from "@/actions/host-playlist";
import { getAllTopTippers } from "@/actions/events";
import { getTopCommunitiesAction } from "@/actions/communities";
import { takeRecentDiscoveryPrograms } from "@/lib/discover-programs";
import type { DiscoverCatalogSnapshot } from "@/lib/discover-catalog-cache";

function normalizeListPayload<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

/** Client-side Discover catalog fetch (shared by Explore and dedicated Discover). */
export async function fetchDiscoverCatalogSnapshot(): Promise<
  Omit<DiscoverCatalogSnapshot, "loadedAt">
> {
  const [feat, lat, spot, rec, most, liveRes, progRes, tipRes, topCommRes, plRes] =
    await Promise.all([
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
    ]);

  let liveStreams = {
    upcoming: [] as unknown[],
    live: [] as unknown[],
    recentlyEnded: [] as unknown[],
  };
  if (liveRes.success && liveRes.data && typeof liveRes.data === "object") {
    const ls = liveRes.data as {
      upcoming?: unknown[];
      live?: unknown[];
      recentlyEnded?: unknown[];
    };
    liveStreams = {
      upcoming: Array.isArray(ls.upcoming) ? ls.upcoming : [],
      live: Array.isArray(ls.live) ? ls.live : [],
      recentlyEnded: Array.isArray(ls.recentlyEnded) ? ls.recentlyEnded : [],
    };
  }

  return {
    contents: feat.success ? normalizeListPayload(feat.data) : [],
    latestContents: lat.success ? normalizeListPayload(lat.data) : [],
    spotlightContents: spot.success ? normalizeListPayload(spot.data) : [],
    recommendedContents: rec.success ? normalizeListPayload(rec.data) : [],
    mostTippedContents: most.success ? normalizeListPayload(most.data) : [],
    liveStreams,
    programs: progRes.success
      ? takeRecentDiscoveryPrograms(normalizeListPayload(progRes.data))
      : [],
    playlists: plRes.success && Array.isArray(plRes.data) ? plRes.data : [],
    tippers: tipRes.success ? normalizeListPayload(tipRes.data) : [],
    topCommunities:
      topCommRes.success && Array.isArray(topCommRes.data?.communities)
        ? topCommRes.data.communities
        : [],
  };
}
