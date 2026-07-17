"use client";

import { DiscoverPanel } from "@/components/tv/discover-panel";

const fixtureLive = {
  id: "e2e-live-channel",
  title: "E2E live stream",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  liveStatus: "LIVE",
  event: { id: "e2e-live-event", numOfTips: 3, amountRaised: 10 },
};

/** Isolated page for Playwright discover live routing tests. */
export default function E2eDiscoverLiveRoutingPage() {
  return (
    <main className="min-h-screen p-4">
      <DiscoverPanel
        surface="discovery"
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
