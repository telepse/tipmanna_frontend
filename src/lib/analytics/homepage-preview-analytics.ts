import type { TvAnalyticsClipMode } from "../analytics-types";
import {
  initAnalyticsSdkRuntime,
} from "../analytics-sdk/runtime";
import {
  isHomepagePreviewAnalyticsV2Enabled,
  isTvSurfaceSdkCollectionActive,
} from "../analytics-sdk/surface-flags";
import { isAnalyticsSdkEnabled } from "../analytics-sdk/flags";
import { initTvAnalyticsRuntime } from "../tvAnalytics";
import {
  syncTvLooperAnalyticsContext,
  trackTvLooperVideoEncounter,
  trackTvLooperVideoStart,
  trackTvLooperWatchDuration,
  type TvLooperAnalyticsContext,
} from "./tv-looper-analytics";

const SURFACE = "homepage_preview" as const;

export function initHomepagePreviewAnalyticsRuntime(): void {
  if (isAnalyticsSdkEnabled() && isHomepagePreviewAnalyticsV2Enabled()) {
    initAnalyticsSdkRuntime();
  } else {
    initTvAnalyticsRuntime();
  }
}

export function buildHomepagePreviewAnalyticsContext(opts: {
  eventId: string | null;
  channelId: string | null;
  scheduleItemId: string | null;
}): TvLooperAnalyticsContext {
  return {
    eventId: opts.eventId,
    channelId: opts.channelId,
    analyticsSurface: SURFACE,
    communityId: null,
  };
}

export async function syncHomepagePreviewAnalyticsContext(
  ctx: TvLooperAnalyticsContext
): Promise<void> {
  await syncTvLooperAnalyticsContext(ctx);
}

export function trackHomepagePreviewVideoEncounter(
  ctx: TvLooperAnalyticsContext,
  opts: {
    mode: TvAnalyticsClipMode;
    scheduleIndex: number;
    scheduleItemId: string;
  }
): void {
  trackTvLooperVideoEncounter(ctx, opts);
}

export function trackHomepagePreviewVideoStart(
  ctx: TvLooperAnalyticsContext,
  scheduleItemId: string,
  mode: TvAnalyticsClipMode,
  scheduleIndex: number,
  channelId?: string
): void {
  trackTvLooperVideoStart(
    ctx,
    scheduleItemId,
    mode,
    scheduleIndex,
    channelId
  );
}

export function trackHomepagePreviewWatchDuration(
  ctx: TvLooperAnalyticsContext,
  scheduleItemId: string,
  watchedSec: number,
  mode: TvAnalyticsClipMode,
  channelId?: string
): void {
  trackTvLooperWatchDuration(
    ctx,
    scheduleItemId,
    watchedSec,
    mode,
    channelId
  );
}
