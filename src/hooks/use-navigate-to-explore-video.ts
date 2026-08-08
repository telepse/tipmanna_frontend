"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  buildExploreHandoffTarget,
  buildExploreVideoHref,
  stashExplorePendingHandoff,
} from "@/lib/explore-video-navigation";
import { warmExploreVideoHandoff } from "@/lib/explore-video-handoff-warm";

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
    (content: TvExploreContentRow) => {
      const target = buildExploreHandoffTarget(content);
      if (!target) return;

      warmExploreVideoHandoff(target);
      stashExplorePendingHandoff(target);

      const href = buildExploreVideoHref(target);
      router.prefetch(href);
      router.push(href);
    },
    [router]
  );
}
