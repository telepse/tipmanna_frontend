"use client";

import { useEffect, useRef } from "react";

import { useTV } from "@/components/tv-provider";
import { isTvDebugEnabled, tvTrace } from "@/lib/tvDebugLog";
import { cn } from "@/lib/utils";

type Variant = "desktopPanel" | "mobileInline" | "phoneLandscapeBar";

type Props = {
  variant: Variant;
  className?: string;
};

/**
 * Live TV / Your TV selector — always driven by TVProvider React `mode` (useTV).
 * No local mode state; underline reflects context mode only.
 */
export function TvModeSelector({ variant, className }: Props) {
  const { mode, goLive, switchToLocal } = useTV();
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => {
    if (!isTvDebugEnabled()) return;
    tvTrace("navigation", "mode_indicator_sync", {
      contextMode: mode,
      displayedMode: mode,
      selectorValue: mode,
      selectorControlled: true,
      localSelectorState: null,
      variant,
      renderCount: renderCountRef.current,
      divergedFromContext: false,
    });
  }, [mode, variant]);

  if (isTvDebugEnabled()) {
    tvTrace("navigation", "mode_indicator_render", {
      contextMode: mode,
      selectorValue: mode,
      variant,
      renderCount: renderCountRef.current,
    });
  }

  const isLandscapeBar = variant === "phoneLandscapeBar";
  const liveClass = cn(
    variant === "mobileInline" && "shrink-0",
    "text-xs whitespace-nowrap",
    mode === "GLOBAL"
      ? "text-destructive underline"
      : isLandscapeBar
        ? "text-white/80"
        : ""
  );
  const localClass = cn(
    variant === "mobileInline" && "shrink-0",
    "text-xs whitespace-nowrap",
    mode === "LOCAL"
      ? "text-success underline"
      : isLandscapeBar
        ? "text-white/80"
        : ""
  );

  const gapClass =
    variant === "phoneLandscapeBar"
      ? "flex min-w-0 items-center gap-2 sm:gap-3"
      : "flex items-center gap-2";

  const onLiveClick = () => {
    if (isTvDebugEnabled()) {
      tvTrace("navigation", "mode_selector_click", {
        target: "Live TV",
        contextModeBeforeClick: mode,
        variant,
      });
    }
    goLive();
  };

  const onLocalClick = () => {
    if (isTvDebugEnabled()) {
      tvTrace("navigation", "mode_selector_click", {
        target: "Your TV",
        contextModeBeforeClick: mode,
        variant,
      });
    }
    switchToLocal();
  };

  return (
    <div className={cn(gapClass, className)}>
      <button
        type="button"
        onClick={onLiveClick}
        className={liveClass}
      >
        Live TV
      </button>
      <button
        type="button"
        onClick={onLocalClick}
        className={localClass}
      >
        Your TV
      </button>
    </div>
  );
}
