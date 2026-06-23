import { DiscoverPageClient } from "@/components/discover/discover-page-client";
import {
  getAllFeaturedContentsAction,
  getDiscoveryProgramsAction,
  getLatestContents,
  getLiveStreamContents,
  getMostTippedContents,
  getSpotlightContents,
} from "@/actions/contents";
import { getAllTopTippers } from "@/actions/events";
import { getDiscoveryAbsoluteUrl } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover creators, programs, and live streams on Tipmanna",
  description:
    "Browse top content, latest videos, spotlight picks, programs, and live streams across Tipmanna.",
};

export default async function DiscoverPage() {
  const [feat, lat, spot, most, liveRes, progRes, tipRes] = await Promise.all([
    getAllFeaturedContentsAction(),
    getLatestContents(),
    getSpotlightContents(),
    getMostTippedContents(),
    getLiveStreamContents(),
    getDiscoveryProgramsAction(),
    getAllTopTippers(),
  ]);

  const featuredRaw = feat.data as unknown;
  const contents = Array.isArray(featuredRaw)
    ? featuredRaw
    : featuredRaw &&
        typeof featuredRaw === "object" &&
        "data" in featuredRaw &&
        Array.isArray((featuredRaw as { data: unknown }).data)
      ? (featuredRaw as { data: unknown[] }).data
      : [];

  const liveData =
    liveRes.success && liveRes.data && typeof liveRes.data === "object"
      ? (liveRes.data as {
          upcoming?: unknown[];
          live?: unknown[];
          recentlyEnded?: unknown[];
        })
      : null;

  const pageDescription =
    "Browse top content, latest videos, spotlight picks, programs, and live streams across Tipmanna.";

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tipmanna Discover",
    url: getDiscoveryAbsoluteUrl("/discover"),
    description: pageDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${getDiscoveryAbsoluteUrl("/discover")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <DiscoverPageClient
        initialContents={contents as never[]}
        initialLatest={
          lat.success && Array.isArray(lat.data) ? (lat.data as never[]) : []
        }
        initialSpotlight={
          spot.success && Array.isArray(spot.data) ? (spot.data as never[]) : []
        }
        initialMostTipped={
          most.success && Array.isArray(most.data) ? (most.data as never[]) : []
        }
        initialPrograms={
          progRes.success && Array.isArray(progRes.data)
            ? (progRes.data as never[])
            : []
        }
        initialLiveStreams={{
          upcoming: Array.isArray(liveData?.upcoming)
            ? (liveData!.upcoming as never[])
            : [],
          live: Array.isArray(liveData?.live) ? (liveData!.live as never[]) : [],
          recentlyEnded: Array.isArray(liveData?.recentlyEnded)
            ? (liveData!.recentlyEnded as never[])
            : [],
        }}
        initialTippers={
          tipRes.success && Array.isArray(tipRes.data)
            ? (tipRes.data as never[])
            : []
        }
      />
    </>
  );
}
