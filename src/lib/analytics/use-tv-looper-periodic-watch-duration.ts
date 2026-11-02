"use client";

import { useEffect, useRef } from "react";
import type { TvAnalyticsClipMode } from "../analytics-types";
import type { TvLooperAnalyticsContext } from "./tv-looper-analytics";
import {
  TV_LOOPER_WATCH_DURATION_TICK_MS,
  type TvLooperWatchDurationScheduler,
} from "./tv-looper-periodic-watch-duration";

/**
 * Emits v2 watch_duration every ~30s of active playback (pause/tab hidden excluded).
 * Pair with segment bind/flush on play start, slot change, natural end, and unmount.
 */
export function useTvLooperPeriodicWatchDuration(opts: {
  isPlaying: boolean;
  tvAnalyticsCtx: TvLooperAnalyticsContext;
  mode: TvAnalyticsClipMode;
  scheduler: TvLooperWatchDurationScheduler;
}): void {
  const { isPlaying, tvAnalyticsCtx, mode, scheduler } = opts;
  const isPlayingRef = useRef(isPlaying);
  const ctxRef = useRef(tvAnalyticsCtx);
  const modeRef = useRef(mode);
  isPlayingRef.current = isPlaying;
  ctxRef.current = tvAnalyticsCtx;
  modeRef.current = mode;

  useEffect(() => {
    if (!isPlaying) {
      scheduler.flush(ctxRef.current);
      return;
    }
    if (document.visibilityState !== "visible") return;
    if (!scheduler.getSegment()) return;
    scheduler.resumeCheckpoint();

    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (!isPlayingRef.current) return;
      scheduler.onPeriodicTick(ctxRef.current);
    }, TV_LOOPER_WATCH_DURATION_TICK_MS);

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        scheduler.flush(ctxRef.current);
      } else if (
        document.visibilityState === "visible" &&
        isPlayingRef.current &&
        scheduler.getSegment()
      ) {
        scheduler.resumeCheckpoint();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
      scheduler.flush(ctxRef.current);
    };
  }, [isPlaying, scheduler, tvAnalyticsCtx]);
}
