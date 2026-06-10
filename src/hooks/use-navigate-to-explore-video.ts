"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import {
  buildExploreVideoHref,
  stashExploreChannelSnapshot,
} from "@/lib/explore-video-navigation";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";

export type TvExploreContentRow = {
  id: string;
  url?: string;
  title?: string;
  event?: { id?: string; title?: string; eventName?: string } | null;
  [key: string]: unknown;
};

export function useNavigateToExploreVideo() {
  const router = useRouter();

  return useCallback(
    (content: TvExploreContentRow) => {
      const eventId = content.event?.id?.trim();
      const videoId = content.id?.trim();
      if (!eventId || !videoId) return;

      const target: ExploreFeedOpenTarget = {
        videoId,
        eventId,
        channelSnapshot: content as Record<string, unknown>,
      };

      stashExploreChannelSnapshot(videoId, target.channelSnapshot ?? {});
      prefetchExploreFeedInitial();
      router.push(buildExploreVideoHref(target));
    },
    [router]
  );
}
