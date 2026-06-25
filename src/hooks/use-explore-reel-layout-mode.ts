"use client";

import { useMemo } from "react";

import {
  resolveExploreReelLayoutMode,
  resolveExploreReelLayoutModeWhileLoading,
  type ExploreReelLayoutMode,
} from "@/lib/explore-reel-layout";
import { isYoutubeShortsUrl } from "@/lib/youtube-immersive-meta";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";

/** Per-slide layout from oEmbed classification + mobile breakpoint. */
export function useExploreReelLayoutMode(
  videoUrl: string | null | undefined,
  isMobile: boolean
): ExploreReelLayoutMode {
  const { aspectInfo, isLoading } = useYoutubeVideoAspect(videoUrl);
  const isShortsUrl = isYoutubeShortsUrl(videoUrl);

  return useMemo(() => {
    if (isLoading) {
      return resolveExploreReelLayoutModeWhileLoading({
        isMobile,
        isShortsUrl,
      });
    }
    return resolveExploreReelLayoutMode({
      isMobile,
      classification: aspectInfo?.classification ?? null,
      isShortsUrl,
    });
  }, [isMobile, isLoading, isShortsUrl, aspectInfo?.classification]);
}
