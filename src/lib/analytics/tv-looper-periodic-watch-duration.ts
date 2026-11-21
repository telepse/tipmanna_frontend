import type { TvAnalyticsClipMode } from "../analytics-types";
import type { TvLooperAnalyticsContext } from "./tv-looper-analytics";
import { trackTvLooperWatchDuration } from "./tv-looper-analytics";

export const TV_LOOPER_WATCH_DURATION_TICK_MS = 30_000;
const MIN_WATCH_SEC = 0.3;
const MAX_WATCH_SEC = 600;

export type TvLooperWatchDurationSegment = {
  itemId: string;
  channelId: string | undefined;
  mode: TvAnalyticsClipMode;
};

export function computeWatchDurationSec(
  checkpointMs: number,
  nowMs: number
): number {
  if (checkpointMs <= 0) return 0;
  return Math.min((nowMs - checkpointMs) / 1000, MAX_WATCH_SEC);
}

export function qualifiesWatchDurationEmit(watchedSec: number): boolean {
  return watchedSec > MIN_WATCH_SEC;
}

/** Tracks elapsed active playback for periodic v2 watch_duration (tv_looper + community_tv_looper). */
export class TvLooperWatchDurationScheduler {
  private checkpointMs = 0;
  private segment: TvLooperWatchDurationSegment | null = null;

  reset(): void {
    this.checkpointMs = 0;
    this.segment = null;
  }

  getSegment(): TvLooperWatchDurationSegment | null {
    return this.segment;
  }

  bindSegment(segment: TvLooperWatchDurationSegment, nowMs = Date.now()): void {
    this.segment = segment;
    this.checkpointMs = nowMs;
  }

  resumeCheckpoint(nowMs = Date.now()): void {
    if (this.segment) {
      this.checkpointMs = nowMs;
    }
  }

  clearCheckpoint(): void {
    this.checkpointMs = 0;
  }

  flush(
    ctx: TvLooperAnalyticsContext,
    nowMs = Date.now()
  ): void {
    if (!this.segment || this.checkpointMs <= 0) return;
    const sec = computeWatchDurationSec(this.checkpointMs, nowMs);
    if (qualifiesWatchDurationEmit(sec)) {
      trackTvLooperWatchDuration(
        ctx,
        this.segment.itemId,
        sec,
        this.segment.mode,
        this.segment.channelId
      );
    }
    this.checkpointMs = 0;
  }

  onPeriodicTick(ctx: TvLooperAnalyticsContext, nowMs = Date.now()): void {
    if (!this.segment || this.checkpointMs <= 0) return;
    const sec = computeWatchDurationSec(this.checkpointMs, nowMs);
    if (!qualifiesWatchDurationEmit(sec)) return;
    trackTvLooperWatchDuration(
      ctx,
      this.segment.itemId,
      sec,
      this.segment.mode,
      this.segment.channelId
    );
    this.checkpointMs = nowMs;
  }
}

export function createTvLooperWatchDurationScheduler(): TvLooperWatchDurationScheduler {
  return new TvLooperWatchDurationScheduler();
}
