"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  exploreReelPresentationFit,
  resolveExploreReelLayoutMode,
  resolveExploreReelLayoutModeWhileLoading,
  resolveExploreReelPresentationVideoSize,
  shouldUpdateExploreReelLayoutMode,
  type ExploreReelLayoutMode,
} from "@/lib/explore-reel-layout";
import {
  isLikelyYoutubeShort,
  isYoutubeShortsUrl,
  mergeYoutubeAspectSources,
  type YoutubeAspectInfo,
} from "@/lib/youtube-immersive-meta";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";

export type ExploreReelPresentationSize = {
  width: number;
  height: number;
};

export type UseExploreReelLayoutModeOptions = {
  durationSeconds?: number | null;
};

export type UseExploreReelLayoutModeResult = {
  layoutMode: ExploreReelLayoutMode;
  /** Canonical merged aspect (oEmbed + thumbnail + player). */
  aspectInfo: YoutubeAspectInfo | null;
  /** Derived from canonical aspectInfo — same source as layout classification. */
  presentationVideoSize: ExploreReelPresentationSize | null;
  /** Derived from layoutMode only. */
  fullPresentationFit: "cover" | "contain";
  isMetadataLoading: boolean;
  onPlayerAspectInfo: (info: YoutubeAspectInfo) => void;
};

/** Single source for iframe sizing dimensions from canonical aspect + layout mode. */
export function derivePresentationVideoSizeFromAspect(
  aspect: YoutubeAspectInfo | null | undefined,
  layoutMode?: ExploreReelLayoutMode
): ExploreReelPresentationSize | null {
  if (layoutMode) {
    return resolveExploreReelPresentationVideoSize(aspect ?? null, layoutMode);
  }
  if (!aspect || aspect.width <= 0 || aspect.height <= 0) return null;
  return { width: aspect.width, height: aspect.height };
}

/** Mirrors onPlayerAspectInfo merge — used by tests and hook. */
export function applyPlayerAspectToCanonical(
  aspectInfo: YoutubeAspectInfo | null,
  playerAspect: YoutubeAspectInfo | null,
  playerUpdate: YoutubeAspectInfo
): {
  playerAspect: YoutubeAspectInfo;
  mergedAspect: YoutubeAspectInfo | null;
  presentationVideoSize: ExploreReelPresentationSize | null;
} {
  const nextPlayer =
    mergeYoutubeAspectSources(playerAspect, playerUpdate) ?? playerUpdate;
  const mergedAspect = mergeYoutubeAspectSources(aspectInfo, nextPlayer);
  return {
    playerAspect: nextPlayer,
    mergedAspect,
    presentationVideoSize: derivePresentationVideoSizeFromAspect(mergedAspect),
  };
}

/** Mirrors onPlayerAspectInfo merge for unit tests (canonical pipeline). */
export function applyExploreReelPlayerAspectUpdate(
  aspectInfo: YoutubeAspectInfo | null,
  playerAspect: YoutubeAspectInfo | null,
  update: YoutubeAspectInfo
): {
  playerAspect: YoutubeAspectInfo;
  mergedAspect: YoutubeAspectInfo | null;
  presentationVideoSize: ExploreReelPresentationSize | null;
} {
  const nextPlayer = mergeYoutubeAspectSources(playerAspect, update) ?? update;
  const merged = mergeYoutubeAspectSources(aspectInfo, nextPlayer);
  return {
    playerAspect: nextPlayer,
    mergedAspect: merged,
    presentationVideoSize: derivePresentationVideoSizeFromAspect(merged),
  };
}

/** Per-slide layout from oEmbed + thumbnail probe + player-ready metadata. */
export function useExploreReelLayoutMode(
  videoUrl: string | null | undefined,
  isMobile: boolean,
  options: UseExploreReelLayoutModeOptions = {}
): UseExploreReelLayoutModeResult {
  const { durationSeconds = null } = options;
  const { aspectInfo, isLoading } = useYoutubeVideoAspect(videoUrl, {
    durationSeconds,
  });
  const isShortsUrl = isYoutubeShortsUrl(videoUrl);
  const isLikelyShort = isLikelyYoutubeShort({
    videoUrl,
    durationSeconds,
  });
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
        isLikelyShort,
      });
    }
    return resolveExploreReelLayoutMode({
      isMobile,
      classification: mergedAspect?.classification ?? null,
      aspect: mergedAspect,
    });
  }, [
    isMobile,
    metadataResolved,
    isShortsUrl,
    isLikelyShort,
    mergedAspect?.classification,
    mergedAspect,
  ]);

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
          metadataResolved,
          { isLikelyShort, aspect: mergedAspect }
        )
      ) {
        return candidate;
      }
      return prev;
    });
  }, [candidate, mergedAspect, metadataResolved, isLikelyShort]);

  const onPlayerAspectInfo = useCallback((info: YoutubeAspectInfo) => {
    setPlayerAspect(prev => mergeYoutubeAspectSources(prev, info) ?? info);
  }, []);

  const layoutMode = stableMode ?? candidate;

  const presentationVideoSize = useMemo(
    () => resolveExploreReelPresentationVideoSize(mergedAspect, layoutMode),
    [mergedAspect, layoutMode]
  );

  return {
    layoutMode,
    aspectInfo: mergedAspect,
    presentationVideoSize,
    fullPresentationFit: exploreReelPresentationFit(layoutMode),
    isMetadataLoading: isLoading && playerAspect == null,
    onPlayerAspectInfo,
  };
}
