"use client";

import { useCallback, useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";

import { SURFACE_PHONE_LANDSCAPE_MEDIA } from "@/lib/surface-breakpoints";

/**
 * TV/TipLink-style phone landscape: auto lock immersive until X dismisses;
 * portrait clears dismiss so the next landscape rotation re-enters immersive.
 */
export function usePhoneLandscapeImmersiveDismiss() {
  const [landscapeLayoutDismissed, setLandscapeLayoutDismissed] =
    useState(false);
  const isPhoneLandscape = useMediaQuery({
    query: SURFACE_PHONE_LANDSCAPE_MEDIA,
  });
  const showPhoneLandscapeImmersive =
    isPhoneLandscape && !landscapeLayoutDismissed;

  useEffect(() => {
    const onOrientation = () => {
      const landscape =
        typeof window !== "undefined" &&
        window.matchMedia("(orientation: landscape)").matches;
      if (!landscape) {
        setLandscapeLayoutDismissed(false);
      }
    };
    window.addEventListener("orientationchange", onOrientation);
    return () => window.removeEventListener("orientationchange", onOrientation);
  }, []);

  const handleLandscapeClose = useCallback(
    (options: { isFullView: boolean; exitFull: () => void }) => {
      if (showPhoneLandscapeImmersive) {
        setLandscapeLayoutDismissed(true);
        return;
      }
      if (options.isFullView) {
        options.exitFull();
      }
    },
    [showPhoneLandscapeImmersive]
  );

  return {
    isPhoneLandscape,
    showPhoneLandscapeImmersive,
    handleLandscapeClose,
  };
}
