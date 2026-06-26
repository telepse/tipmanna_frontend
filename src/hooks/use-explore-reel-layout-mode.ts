"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  resolveExploreReelLayoutMode,
  resolveExploreReelLayoutModeWhileLoading,
  shouldUpdateExploreReelLayoutMode,
  type ExploreReelLayoutMode,
} from "@/lib/explore-reel-layout";
import {
  isYoutubeShortsUrl,
  mergeYoutubeAspectSources,
  type YoutubeAspectInfo,
} from "@/lib/youtube-immersive-meta";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";

export type UseExploreReelLayoutModeResult = {
  layoutMode: ExploreReelLayoutMode;
  onPlayerAspectInfo: (info: YoutubeAspectInfo) => void;
};

/** Per-slide layout from oEmbed + thumbnail probe + player-ready metadata. */
export function useExploreReelLayoutMode(
  videoUrl: string | null | undefined,
  isMobile: boolean
): UseExploreReelLayoutModeResult {
  const { aspectInfo, isLoading } = useYoutubeVideoAspect(videoUrl);
  const isShortsUrl = isYoutubeShortsUrl(videoUrl);
  const [playerAspect, setPlayerAspect] = useState<YoutubeAspectInfo | null>(
    null
  );
  const [stableMode, setStableMode] = useState<ExploreReelLayoutMode | null>(
    null
  );

  const mergedAspect = useMemo(
    () => mergeYoutubeAspectSources(aspectInfo, playerAspect),
    [aspectInfo, playerAspect]
  );

  const metadataResolved = !isLoading || playerAspect != null;

  const candidate = useMemo(() => {
    if (!metadataResolved) {
      return resolveExploreReelLayoutModeWhileLoading({
        isMobile,
        isShortsUrl,
      });
    }
    return resolveExploreReelLayoutMode({
      isMobile,
      classification: mergedAspect?.classification ?? null,
    });
  }, [isMobile, metadataResolved, isShortsUrl, mergedAspect?.classification]);

  useEffect(() => {
    setStableMode(null);
    setPlayerAspect(null);
  }, [videoUrl]);

  useEffect(() => {
    setStableMode(prev => {
      if (prev == null) return candidate;
      if (
        shouldUpdateExploreReelLayoutMode(
          prev,
          candidate,
          mergedAspect?.classification ?? null,
          metadataResolved
        )
      ) {
        return candidate;
      }
      return prev;
    });
  }, [candidate, mergedAspect?.classification, metadataResolved]);

  const onPlayerAspectInfo = useCallback((info: YoutubeAspectInfo) => {
    setPlayerAspect(prev => mergeYoutubeAspectSources(prev, info) ?? info);
  }, []);

  return {
    layoutMode: stableMode ?? candidate,
    onPlayerAspectInfo,
  };
}
