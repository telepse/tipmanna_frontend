/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { DiscoverPanel } from "@/components/tv/discover-panel";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { fetchDiscoverCatalogSnapshot } from "@/lib/discover-catalog-client";
import {
  readDiscoverCatalogCache,
  writeDiscoverCatalogCache,
  isDiscoverCatalogStale,
  DISCOVER_LIVE_RAIL_STALE_MS,
  type DiscoverCatalogSnapshot,
} from "@/lib/discover-catalog-cache";
import { notifyDiscoverCatalogReady } from "@/lib/discover-return.util";

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
  initialPlaylists?: any[];
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
  initialPlaylists = [],
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);

  const applyCatalogSnapshot = useCallback((snapshot: DiscoverCatalogSnapshot) => {
    setContents(snapshot.contents as any[]);
    setLatestContents(snapshot.latestContents as any[]);
    setSpotlightContents(snapshot.spotlightContents as any[]);
    setRecommendedContents(snapshot.recommendedContents as any[]);
    setMostTippedContents(snapshot.mostTippedContents as any[]);
    setPrograms(snapshot.programs as any[]);
    setPlaylists(snapshot.playlists as any[]);
    setLiveStreams(snapshot.liveStreams as LiveStreams);
    setTippers(snapshot.tippers as any[]);
    setTopCommunities(snapshot.topCommunities as any[]);
    notifyDiscoverCatalogReady();
  }, []);

  const loadDiscoverCatalog = useCallback(
    async (options?: { background?: boolean }) => {
      if (options?.background) setCatalogRefreshing(true);
      try {
        const snapshot = await fetchDiscoverCatalogSnapshot();
        applyCatalogSnapshot({ ...snapshot, loadedAt: Date.now() });
        writeDiscoverCatalogCache(snapshot);
      } finally {
        setCatalogRefreshing(false);
      }
    },
    [applyCatalogSnapshot]
  );

  useEffect(() => {
    router.prefetch("/explore");
    prefetchExploreFeedInitial();
    const cached = readDiscoverCatalogCache();
    if (cached) {
      applyCatalogSnapshot(cached);
      if (isDiscoverCatalogStale(cached, DISCOVER_LIVE_RAIL_STALE_MS)) {
        void loadDiscoverCatalog({ background: true });
      }
      return;
    }
    writeDiscoverCatalogCache({
      contents: initialContents,
      latestContents: initialLatest,
      spotlightContents: initialSpotlight,
      recommendedContents: initialRecommended,
      mostTippedContents: initialMostTipped,
      programs: initialPrograms,
      playlists: initialPlaylists,
      liveStreams: initialLiveStreams,
      tippers: initialTippers,
      topCommunities: initialTopCommunities,
    });
  }, [
    applyCatalogSnapshot,
    initialContents,
    initialLatest,
    initialMostTipped,
    initialPlaylists,
    initialPrograms,
    initialRecommended,
    initialSpotlight,
    initialLiveStreams,
    initialTippers,
    initialTopCommunities,
    loadDiscoverCatalog,
    router,
  ]);

  const handlePlayInExplore = (target: ExploreFeedOpenTarget) => {
    navigateToExploreVideo(
      {
        id: target.videoId,
        event: { id: target.eventId },
        ...(target.channelSnapshot ?? {}),
      },
      {
        discoverReturnTo: target.discoverReturnTo,
        discoverReturnLabel: target.discoverReturnLabel,
      }
    );
  };

  return (
    <main
      id="main-content"
      className="mx-auto flex h-[100dvh] max-w-6xl flex-col overflow-hidden"
    >
      <header className="shrink-0 border-b px-4 py-6">
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

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
      >
        <DiscoverPanel
          surface="discovery"
          scrollContainerRef={scrollContainerRef}
          onPlayInExplore={handlePlayInExplore}
          onRefreshCatalog={() => void loadDiscoverCatalog({ background: true })}
          catalogRefreshing={catalogRefreshing}
          contents={contents}
          latestContents={latestContents}
          spotlightContents={spotlightContents}
          recommendedContents={recommendedContents}
          mostTippedContents={mostTippedContents}
          programs={programs}
          liveStreams={liveStreams}
          tippers={tippers}
          topCommunities={topCommunities}
          playlists={playlists}
          initialSearchTerm={initialSearchTerm}
          catalogLoading={false}
          className="space-y-6"
        />
      </div>
    </main>
  );
}
