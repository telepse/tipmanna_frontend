"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { extractYoutubeID } from "@/lib/extractYoutubeID";
import type {
  ImmersiveLayoutMode,
  YoutubeVideoClassification,
} from "@/lib/youtube-immersive-meta";
import { fetchYoutubeAspectInfo } from "@/lib/youtube-immersive-meta";
import { useYoutubeVideoAspect } from "@/hooks/use-youtube-immersive-layout";
import { tvTrace } from "@/lib/tvDebugLog";

/** Unified mobile video presentation (orientation-independent). */
export const VIEW_MODE = {
  INLINE: "INLINE",
  FULL_LANDSCAPE: "FULL_LANDSCAPE",
  FULL_PORTRAIT: "FULL_PORTRAIT",
} as const;

export type MobileVideoViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

/** Map oEmbed classification (incl. square) to full-screen layout variant. */
function fullViewClassification(
  classification: YoutubeVideoClassification
): "portrait" | "landscape" {
  return classification === "portrait" ? "portrait" : "landscape";
}

export function viewModeToImmersiveLayout(
  mode: MobileVideoViewMode
): ImmersiveLayoutMode {
  if (mode === VIEW_MODE.FULL_PORTRAIT) return "portrait_video";
  return "landscape_video";
}

export type UseMobileVideoViewModeOptions = {
  videoUrl: string | null | undefined;
  /** When false, full modes are ignored for layout (surface stays INLINE). */
  isMobile: boolean;
  /**
   * TV phone landscape: force FULL_LANDSCAPE until unlocked (orientation back to portrait).
   * Does not remount the player.
   */
  lockFullLandscape?: boolean;
  /**
   * When this identity changes (e.g. TV schedule item id), view resets to INLINE
   * and manual full-variant override is cleared. Omit for channel-style surfaces.
   */
  resetAnchor?: string | null | undefined;
};

/**
 * Shared view-mode state for Channel / Content / TV Looper.
 * Full modes apply only when `isMobile` is true. Playback is unaffected (no player remount).
 */
export function useMobileVideoViewMode({
  videoUrl,
  isMobile,
  lockFullLandscape = false,
  resetAnchor,
}: UseMobileVideoViewModeOptions) {
  const { aspectInfo } = useYoutubeVideoAspect(videoUrl);
  const [viewMode, setViewMode] = useState<MobileVideoViewMode>(
    VIEW_MODE.INLINE
  );
  const userPinnedFullVariantRef = useRef(false);
  const prevResetAnchorRef = useRef<typeof resetAnchor>(undefined);
  const prevVideoIdRef = useRef<string | undefined>(undefined);
  /** Bumps on each enter/exit so stale `fetchYoutubeAspectInfo` resolves never apply the wrong state. */
  const enterFullGenerationRef = useRef(0);

  useEffect(() => {
    if (resetAnchor === undefined) return;
    if (prevResetAnchorRef.current === resetAnchor) return;
    prevResetAnchorRef.current = resetAnchor;
    userPinnedFullVariantRef.current = false;
    enterFullGenerationRef.current += 1;
    setViewMode(VIEW_MODE.INLINE);
  }, [resetAnchor]);

  const prevLockFullLandscapeRef = useRef(lockFullLandscape);
  useEffect(() => {
    if (lockFullLandscape) {
      userPinnedFullVariantRef.current = false;
      setViewMode(VIEW_MODE.FULL_LANDSCAPE);
    } else if (prevLockFullLandscapeRef.current && !lockFullLandscape) {
      if (!userPinnedFullVariantRef.current) {
        enterFullGenerationRef.current += 1;
        setViewMode(VIEW_MODE.INLINE);
      }
    }
    prevLockFullLandscapeRef.current = lockFullLandscape;
  }, [lockFullLandscape]);

  const effectiveViewMode = lockFullLandscape
    ? VIEW_MODE.FULL_LANDSCAPE
    : viewMode;

  const isFullView = isMobile && effectiveViewMode !== VIEW_MODE.INLINE;
  const immersiveLayout: ImmersiveLayoutMode = isFullView
    ? viewModeToImmersiveLayout(effectiveViewMode)
    : "landscape_video";

  /** FULL_LANDSCAPE: cover stage; FULL_PORTRAIT: contain (no cropping / “shrinking” the frame). */
  const fullPresentationFit: "cover" | "contain" | null = isFullView
    ? effectiveViewMode === VIEW_MODE.FULL_LANDSCAPE
      ? "cover"
      : "contain"
    : null;

  const videoId = extractYoutubeID(videoUrl ?? "") ?? undefined;

  /** Full-view UI is mobile-only; avoid desktop/tablet layout with a stale FULL_* mode. */
  useEffect(() => {
    if (lockFullLandscape) return;
    if (isMobile) return;
    if (viewMode === VIEW_MODE.INLINE) return;
    userPinnedFullVariantRef.current = false;
    enterFullGenerationRef.current += 1;
    setViewMode(VIEW_MODE.INLINE);
  }, [isMobile, viewMode, lockFullLandscape]);

  useEffect(() => {
    if (viewMode === VIEW_MODE.INLINE) {
      prevVideoIdRef.current = videoId;
      return;
    }
    if (userPinnedFullVariantRef.current) {
      prevVideoIdRef.current = videoId;
      return;
    }
    if (!videoId || !aspectInfo || aspectInfo.videoId !== videoId) return;
    const next =
      aspectInfo.classification === "portrait"
        ? VIEW_MODE.FULL_PORTRAIT
        : VIEW_MODE.FULL_LANDSCAPE;
    if (viewMode === next) {
      prevVideoIdRef.current = videoId;
      return;
    }
    setViewMode(next);
    prevVideoIdRef.current = videoId;
  }, [videoId, aspectInfo, viewMode]);

  const enterFull = useCallback(() => {
    if (!isMobile || lockFullLandscape) return;
    tvTrace("fullscreen", "full_view_enter_start", {
      videoUrl: videoUrl ?? null,
    });
    const id = extractYoutubeID(videoUrl ?? "") ?? undefined;

    userPinnedFullVariantRef.current = false;
    enterFullGenerationRef.current += 1;
    const generation = enterFullGenerationRef.current;

    const applyMode = (classification: "portrait" | "landscape") => {
      if (generation !== enterFullGenerationRef.current) return;
      const nextMode =
        classification === "portrait"
          ? VIEW_MODE.FULL_PORTRAIT
          : VIEW_MODE.FULL_LANDSCAPE;
      tvTrace("fullscreen", "full_view_enter", {
        viewMode: nextMode,
        videoId: id,
      });
      setViewMode(nextMode);
    };

    if (!id) {
      applyMode("landscape");
      return;
    }

    if (aspectInfo?.videoId === id) {
      applyMode(fullViewClassification(aspectInfo.classification));
      return;
    }

    void (async () => {
      const info = await fetchYoutubeAspectInfo(videoUrl);
      if (generation !== enterFullGenerationRef.current) return;
      if (!info || info.videoId !== id) {
        applyMode("landscape");
        return;
      }
      applyMode(fullViewClassification(info.classification));
    })();
  }, [isMobile, lockFullLandscape, aspectInfo, videoUrl]);

  const exitFull = useCallback(() => {
    if (lockFullLandscape) return;
    tvTrace("fullscreen", "full_view_exit", { previousViewMode: viewMode });
    userPinnedFullVariantRef.current = false;
    enterFullGenerationRef.current += 1;
    setViewMode(VIEW_MODE.INLINE);
  }, [viewMode, lockFullLandscape]);

  /**
   * Flip FULL_LANDSCAPE ↔ FULL_PORTRAIT (single `setViewMode`, no player remount).
   * From INLINE: opens full view in the layout opposite oEmbed default (pinned).
   */
  const toggleFullVariant = useCallback(() => {
    if (!isMobile || lockFullLandscape) return;

    if (viewMode !== VIEW_MODE.INLINE) {
      userPinnedFullVariantRef.current = true;
      setViewMode(m =>
        m === VIEW_MODE.FULL_LANDSCAPE
          ? VIEW_MODE.FULL_PORTRAIT
          : VIEW_MODE.FULL_LANDSCAPE
      );
      return;
    }

    enterFullGenerationRef.current += 1;
    const generation = enterFullGenerationRef.current;
    userPinnedFullVariantRef.current = true;

    const id = extractYoutubeID(videoUrl ?? "") ?? undefined;
    if (!id) return;

    const applyFlipped = (classification: "portrait" | "landscape") => {
      if (generation !== enterFullGenerationRef.current) return;
      const fromAspect =
        classification === "portrait"
          ? VIEW_MODE.FULL_PORTRAIT
          : VIEW_MODE.FULL_LANDSCAPE;
      setViewMode(
        fromAspect === VIEW_MODE.FULL_LANDSCAPE
          ? VIEW_MODE.FULL_PORTRAIT
          : VIEW_MODE.FULL_LANDSCAPE
      );
    };

    if (aspectInfo?.videoId === id) {
      applyFlipped(fullViewClassification(aspectInfo.classification));
      return;
    }

    void (async () => {
      const info = await fetchYoutubeAspectInfo(videoUrl);
      if (generation !== enterFullGenerationRef.current) return;
      if (!info || info.videoId !== id) {
        setViewMode(VIEW_MODE.FULL_PORTRAIT);
        return;
      }
      applyFlipped(fullViewClassification(info.classification));
    })();
  }, [isMobile, lockFullLandscape, viewMode, aspectInfo, videoUrl]);

  /** Icon hint: portrait-oriented control when the *next* layout is / will be portrait. */
  const fullLayoutToggleShowsPortraitIcon =
    effectiveViewMode === VIEW_MODE.FULL_LANDSCAPE ||
    (effectiveViewMode === VIEW_MODE.INLINE &&
      !(
        aspectInfo &&
        videoId &&
        aspectInfo.videoId === videoId &&
        aspectInfo.classification === "portrait"
      ));

  return {
    viewMode,
    isFullView,
    fullPresentationFit,
    fullLayoutToggleShowsPortraitIcon,
    /** For `immersiveMainRowClassName` / `TvPlayer` cover+contain: use only when `isFullView`. */
    immersiveLayout,
    enterFull,
    exitFull,
    toggleFullVariant,
    aspectInfo,
  };
}
