/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  getAllFeaturedContentsAction,
  getDiscoveryProgramsAction,
  getLatestContents,
  getLiveStreamContents,
  getMostTippedContents,
  getRecommendedContents,
  getSpotlightContents,
} from "@/actions/contents";
import { getCommunityExploreCatalogAction } from "@/actions/communities";
import { getAllTopTippers } from "@/actions/events";
import { DiscoverPanel } from "@/components/tv/discover-panel";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";
import { normalizeListPayload } from "@/lib/list-response-normalizer";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";

type LiveStreams = {
  upcoming: any[];
  live: any[];
  recentlyEnded: any[];
};

type Props = {
  initialContents: any[];
  initialLatest: any[];
  initialSpotlight: any[];
  initialRecommended: any[];
  initialMostTipped: any[];
  initialPrograms: any[];
  initialLiveStreams: LiveStreams;
  initialTippers: any[];
  initialTopCommunities?: any[];
};

export function DiscoverPageClient({
  initialContents,
  initialLatest,
  initialSpotlight,
  initialRecommended,
  initialMostTipped,
  initialPrograms,
  initialLiveStreams,
  initialTippers,
  initialTopCommunities = [],
}: Props) {
  const searchParams = useSearchParams();
  const initialSearchTerm = searchParams.get("q")?.trim() ?? "";
  const navigateToExploreVideo = useNavigateToExploreVideo();

  const [contents, setContents] = useState(initialContents);
  const [latestContents, setLatestContents] = useState(initialLatest);
  const [spotlightContents, setSpotlightContents] = useState(initialSpotlight);
  const [recommendedContents, setRecommendedContents] =
    useState(initialRecommended);
  const [mostTippedContents, setMostTippedContents] =
    useState(initialMostTipped);
  const [programs, setPrograms] = useState(initialPrograms);
  const [liveStreams, setLiveStreams] = useState(initialLiveStreams);
  const [tippers, setTippers] = useState(initialTippers);
  const [topCommunities, setTopCommunities] = useState(initialTopCommunities);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void (async () => {
      try {
        const [feat, lat, spot, rec, most, liveRes, progRes, tipRes, commRes] =
          await Promise.all([
            getAllFeaturedContentsAction(),
            getLatestContents(),
            getSpotlightContents(),
            getRecommendedContents(),
            getMostTippedContents(),
            getLiveStreamContents(),
            getDiscoveryProgramsAction(),
            getAllTopTippers(),
            getCommunityExploreCatalogAction(),
          ]);
        if (cancelled) return;

        if (feat.success) setContents(normalizeListPayload(feat.data));
        if (lat.success) setLatestContents(normalizeListPayload(lat.data));
        if (spot.success)
          setSpotlightContents(normalizeListPayload(spot.data));
        if (rec.success)
          setRecommendedContents(normalizeListPayload(rec.data));
        if (most.success)
          setMostTippedContents(normalizeListPayload(most.data));
        if (progRes.success)
          setPrograms(normalizeListPayload(progRes.data));
        if (tipRes.success) setTippers(normalizeListPayload(tipRes.data));

        if (liveRes.success && liveRes.data && typeof liveRes.data === "object") {
          const ls = liveRes.data as LiveStreams;
          setLiveStreams({
            upcoming: Array.isArray(ls.upcoming) ? ls.upcoming : [],
            live: Array.isArray(ls.live) ? ls.live : [],
            recentlyEnded: Array.isArray(ls.recentlyEnded)
              ? ls.recentlyEnded
              : [],
          });
        }

        if (commRes.success && Array.isArray(commRes.data?.topByTips)) {
          setTopCommunities(commRes.data.topByTips);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePlayInExplore = (target: ExploreFeedOpenTarget) => {
    navigateToExploreVideo({
      id: target.videoId,
      event: { id: target.eventId },
      ...(target.channelSnapshot ?? {}),
    });
  };

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col"
    >
      <header className="border-b px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold sm:text-4xl">
              Discover creators, programs &amp; live streams
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-normal">
              Browse curated rails, search by category, and jump into creator
              event rooms — then continue watching on Tipmanna TV.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/partner"
              className="bg-primary inline-flex shrink-0 rounded-md px-4 py-2.5 text-sm font-medium text-white"
            >
              About Tipmanna
            </Link>
            <Link
              href={getPublicAbsoluteUrl("/explore")}
              className="inline-flex shrink-0 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white"
            >
              Watch on Tipmanna TV
            </Link>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <DiscoverPanel
          surface="discovery"
          onPlayInExplore={handlePlayInExplore}
          contents={contents}
          latestContents={latestContents}
          spotlightContents={spotlightContents}
          recommendedContents={recommendedContents}
          mostTippedContents={mostTippedContents}
          programs={programs}
          liveStreams={liveStreams}
          tippers={tippers}
          topCommunities={topCommunities}
          initialSearchTerm={initialSearchTerm}
          catalogLoading={catalogLoading}
          className="space-y-6"
        />
      </div>
    </main>
  );
}
