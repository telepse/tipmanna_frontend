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
 * Live TV / Your TV selector — driven by TVProvider `mode` and PPLA flag.
 */
export function TvModeSelector({ variant, className }: Props) {
  const { mode, isPostPaymentLiveAxis, goLive, switchToLocal } = useTV();
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const liveActive = mode === "GLOBAL" || isPostPaymentLiveAxis;
  const localActive = mode === "LOCAL" || isPostPaymentLiveAxis;

  useEffect(() => {
    if (!isTvDebugEnabled()) return;
    tvTrace("navigation", "mode_indicator_sync", {
      contextMode: mode,
      isPostPaymentLiveAxis,
      displayedMode: mode,
      selectorValue: mode,
      liveActive,
      localActive,
      selectorControlled: true,
      localSelectorState: null,
      variant,
      renderCount: renderCountRef.current,
      divergedFromContext: false,
    });
  }, [mode, isPostPaymentLiveAxis, liveActive, localActive, variant]);

  if (isTvDebugEnabled()) {
    tvTrace("navigation", "mode_indicator_render", {
      contextMode: mode,
      isPostPaymentLiveAxis,
      selectorValue: mode,
      liveActive,
      localActive,
      variant,
      renderCount: renderCountRef.current,
    });
  }

  const isLandscapeBar = variant === "phoneLandscapeBar";
  const liveClass = cn(
    variant === "mobileInline" && "shrink-0",
    "text-xs whitespace-nowrap",
    liveActive
      ? "text-destructive underline"
      : isLandscapeBar
        ? "text-white/80"
        : ""
  );
  const localClass = cn(
    variant === "mobileInline" && "shrink-0",
    "text-xs whitespace-nowrap",
    localActive
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
        isPostPaymentLiveAxis,
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
        isPostPaymentLiveAxis,
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
