/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Local imports
import { DiscoverPanel } from "@/components/tv/discover-panel";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";
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

  // Dedicated Discover page reuses the Explore playback session: standard
  // videos hand off to /explore (the long-lived ExploreFeedClient) rather than
  // opening a separate content surface. Live streams/programs/communities keep
  // their dedicated destinations (handled inside DiscoverPanel).
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
          contents={initialContents}
          latestContents={initialLatest}
          spotlightContents={initialSpotlight}
          recommendedContents={initialRecommended}
          mostTippedContents={initialMostTipped}
          programs={initialPrograms}
          liveStreams={initialLiveStreams}
          tippers={initialTippers}
          topCommunities={initialTopCommunities}
          initialSearchTerm={initialSearchTerm}
          catalogLoading={false}
          className="space-y-6"
        />
      </div>
    </main>
  );
}
