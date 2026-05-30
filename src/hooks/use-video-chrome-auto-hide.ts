"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_MS = 5000;

/**
 * Auto-hide title/scrubber overlays after `inactiveMs` idle time; show again on interaction.
 * Spread `interactionProps` on the player shell so taps restart the timer.
 */
export function useVideoChromeAutoHide({
  inactiveMs = DEFAULT_MS,
  resetKey,
  suspendWhile = false,
}: {
  inactiveMs?: number;
  resetKey?: string | number | null;
  suspendWhile?: boolean;
}) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimer();
    setVisible(true);
    if (suspendWhile) return;
    timerRef.current = setTimeout(() => setVisible(false), inactiveMs);
  }, [inactiveMs, suspendWhile, clearTimer]);

  useEffect(() => {
    scheduleHide();
    return clearTimer;
  }, [resetKey, scheduleHide, clearTimer]);

  const chromeOpacityClass = visible
    ? "opacity-100"
    : "opacity-0 pointer-events-none";

  const interactionProps = {
    onPointerDownCapture: scheduleHide,
    onKeyDownCapture: () => {
      scheduleHide();
    },
  };

  return {
    visible,
    chromeOpacityClass,
    chromeTransitionClass:
      "transition-opacity duration-200 ease-out will-change-[opacity]",
    interactionProps,
  };
}
