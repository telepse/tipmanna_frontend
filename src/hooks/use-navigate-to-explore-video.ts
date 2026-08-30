"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import {
  buildExploreHandoffTarget,
  buildExploreVideoHref,
  stashExplorePendingHandoff,
} from "@/lib/explore-video-navigation";
import { warmExploreVideoHandoff } from "@/lib/explore-video-handoff-warm";
import { writePlaybackReturn } from "@/lib/playback-return-stack";
import {
  isDedicatedDiscoverReturnTo,
  peekDiscoverUiRestore,
} from "@/lib/discover-return.util";

export type TvExploreContentRow = {
  id: string;
  url?: string;
  title?: string;
  liveStatus?: string;
  event?: { id?: string; title?: string; eventName?: string } | null;
  [key: string]: unknown;
};

export function useNavigateToExploreVideo() {
  const router = useRouter();

  return useCallback(
    (
      content: TvExploreContentRow,
      opts?: Pick<ExploreFeedOpenTarget, "discoverReturnTo" | "discoverReturnLabel">
    ) => {
      const target = buildExploreHandoffTarget(content);
      if (!target) return;

      if (opts?.discoverReturnTo) {
        target.discoverReturnTo = opts.discoverReturnTo;
      }
      if (opts?.discoverReturnLabel) {
        target.discoverReturnLabel = opts.discoverReturnLabel;
      }

      if (
        target.discoverReturnTo &&
        isDedicatedDiscoverReturnTo(target.discoverReturnTo)
      ) {
        writePlaybackReturn({
          returnTo: target.discoverReturnTo,
          label: target.discoverReturnLabel ?? "Back to Discover",
          discoverUi: peekDiscoverUiRestore() ?? undefined,
        });
      }

      warmExploreVideoHandoff(target);
      stashExplorePendingHandoff(target);

      const href = buildExploreVideoHref(target);
      router.prefetch(href);
      router.push(href);
    },
    [router]
  );
}
