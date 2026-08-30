"use client";

import { DiscoverPanel } from "@/components/tv/discover-panel";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";

const fixtureClip = {
  id: "e2e-handoff-video",
  title: "E2E handoff clip",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  liveStatus: "NOT_LIVE",
  event: { id: "e2e-handoff-event", numOfTips: 1, amountRaised: 5 },
};

/** Deterministic Discover → Explore handoff (no backend). */
export default function E2eDiscoverExploreHandoffPage() {
  const navigateToExploreVideo = useNavigateToExploreVideo();
  const handlePlayInExplore = (target: ExploreFeedOpenTarget) => {
    navigateToExploreVideo({
      id: target.videoId,
      event: { id: target.eventId },
      ...(target.channelSnapshot ?? {}),
    });
  };

  return (
    <main className="min-h-screen p-4">
      <DiscoverPanel
        surface="discovery"
        onPlayInExplore={handlePlayInExplore}
        contents={[fixtureClip]}
        latestContents={[]}
        mostTippedContents={[]}
        tippers={[]}
        liveStreams={{ live: [], upcoming: [], recentlyEnded: [] }}
        catalogLoading={false}
      />
    </main>
  );
}
