"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { buildExploreVideoHref } from "@/lib/explore-video-navigation";
import { warmExploreVideoHandoff } from "@/lib/explore-video-handoff-warm";

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

      warmExploreVideoHandoff(target);
      const href = buildExploreVideoHref(target);
      router.prefetch(href);
      router.push(href);
    },
    [router]
  );
}
