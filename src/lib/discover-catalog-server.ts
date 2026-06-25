import {
  getAllFeaturedContentsAction,
  getDiscoveryProgramsAction,
  getLatestContents,
  getLiveStreamContents,
  getMostTippedContents,
  getRecommendedContents,
  getSpotlightContents,
} from "@/actions/contents";
import { getAllTopTippers } from "@/actions/events";
import { normalizeListPayload } from "@/lib/list-response-normalizer";

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
};

export async function loadDiscoverCatalogServer(): Promise<DiscoverCatalog> {
  const [feat, lat, spot, rec, most, liveRes, progRes, tipRes] =
    await Promise.all([
      getAllFeaturedContentsAction(),
      getLatestContents(),
      getSpotlightContents(),
      getRecommendedContents(),
      getMostTippedContents(),
      getLiveStreamContents(),
      getDiscoveryProgramsAction(),
      getAllTopTippers(),
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
    programs: normalizeListPayload(progRes.data),
    liveStreams: {
      upcoming: Array.isArray(liveData?.upcoming) ? liveData!.upcoming : [],
      live: Array.isArray(liveData?.live) ? liveData!.live : [],
      recentlyEnded: Array.isArray(liveData?.recentlyEnded)
        ? liveData!.recentlyEnded
        : [],
    },
    tippers: normalizeListPayload(tipRes.data),
  };
}
