"use client";

import { DiscoverPanel } from "@/components/tv/discover-panel";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";

const fixtureLive = {
  id: "e2e-live-channel",
  title: "E2E live stream",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  liveStatus: "LIVE",
  event: { id: "e2e-live-event", numOfTips: 3, amountRaised: 10 },
};

/** Isolated page for Playwright discover live routing tests. */
export default function E2eDiscoverLiveRoutingPage() {
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
        contents={[]}
        latestContents={[]}
        mostTippedContents={[]}
        tippers={[]}
        liveStreams={{
          live: [fixtureLive],
          upcoming: [],
          recentlyEnded: [],
        }}
        catalogLoading={false}
      />
    </main>
  );
}
