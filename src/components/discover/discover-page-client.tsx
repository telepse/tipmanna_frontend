/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { DiscoverPanel } from "@/components/tv/discover-panel";
import Link from "next/link";

type LiveStreams = {
  upcoming: any[];
  live: any[];
  recentlyEnded: any[];
};

type Props = {
  initialContents: any[];
  initialLatest: any[];
  initialSpotlight: any[];
  initialMostTipped: any[];
  initialPrograms: any[];
  initialLiveStreams: LiveStreams;
  initialTippers: any[];
};

export function DiscoverPageClient({
  initialContents,
  initialLatest,
  initialSpotlight,
  initialMostTipped,
  initialPrograms,
  initialLiveStreams,
  initialTippers,
}: Props) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col"
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Discover Tipmanna</h1>
          <p className="text-muted-foreground text-xs">
            Browse programs, live streams, and community content.
          </p>
        </div>
        <Link
          href="/explore"
          className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white"
        >
          Open Tipmanna TV
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <DiscoverPanel
          contents={initialContents}
          latestContents={initialLatest}
          spotlightContents={initialSpotlight}
          mostTippedContents={initialMostTipped}
          programs={initialPrograms}
          liveStreams={initialLiveStreams}
          tippers={initialTippers}
          catalogLoading={false}
        />
      </div>
    </main>
  );
}
