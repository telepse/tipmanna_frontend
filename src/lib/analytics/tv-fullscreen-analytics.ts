import type { PaymentSurface, TvAnalyticsClipMode } from "../analytics-types";
import { getAnalyticsSessionId, getDeviceCategory } from "../analytics-session";
import {
  tvFullscreenPlaybackComplete,
  tvFullscreenPlaybackOnPlayStateChange,
  tvFullscreenPlaybackOnVideoLoaded,
  tvFullscreenPlaybackWatchSegment,
} from "../analytics-sdk/tv-fullscreen-playback";
import { flushSdkAnalytics } from "../analytics-sdk/transport";
import {
  initAnalyticsSdkRuntime,
  setAnalyticsSdkRuntimeContext,
} from "../analytics-sdk/runtime";
import { isTvFullscreenSdkCollectionActive } from "../analytics-sdk/surface-flags";

export type TvFullscreenAnalyticsContext = {
  eventId: string | null;
  channelId: string | null;
  communityId: string | null;
};

const SURFACE: PaymentSurface = "tv_fullscreen";

/** No-op when flag off — surface had zero instrumentation before Wave 3b. */
export function initTvFullscreenAnalyticsRuntime(): void {
  if (isTvFullscreenSdkCollectionActive()) {
    initAnalyticsSdkRuntime();
  }
}

function buildSdkContext(ctx: TvFullscreenAnalyticsContext) {
  return {
    sessionId: getAnalyticsSessionId(),
    surface: SURFACE,
    deviceCategory: getDeviceCategory(),
    ...(ctx.eventId ? { eventId: ctx.eventId } : {}),
    ...(ctx.channelId ? { videoChannelId: ctx.channelId } : {}),
    ...(ctx.communityId ? { communityId: ctx.communityId } : {}),
  };
}

export async function syncTvFullscreenAnalyticsContext(
  ctx: TvFullscreenAnalyticsContext
): Promise<void> {
  if (!isTvFullscreenSdkCollectionActive()) return;
  const sdkCtx = buildSdkContext(ctx);
  await flushSdkAnalytics({ ctx: sdkCtx, auth: {} });
  setAnalyticsSdkRuntimeContext(sdkCtx);
}

export function trackTvFullscreenVideoEncounter(
  ctx: TvFullscreenAnalyticsContext,
  opts: { scheduleIndex: number; isPlaying: boolean }
): void {
  if (!isTvFullscreenSdkCollectionActive() || !ctx.channelId) return;
  tvFullscreenPlaybackOnVideoLoaded({
    eventId: ctx.eventId ?? "tv-fullscreen",
    videoChannelId: ctx.channelId,
    communityId: ctx.communityId,
    scheduleIndex: opts.scheduleIndex,
    isPlaying: opts.isPlaying,
  });
}

export function trackTvFullscreenVideoStart(
  ctx: TvFullscreenAnalyticsContext,
  scheduleIndex: number
): void {
  if (!isTvFullscreenSdkCollectionActive() || !ctx.channelId) return;
  tvFullscreenPlaybackOnPlayStateChange(true, scheduleIndex);
}

export function trackTvFullscreenWatchDuration(
  ctx: TvFullscreenAnalyticsContext,
  watchedSec: number
): void {
  if (!isTvFullscreenSdkCollectionActive() || !ctx.channelId) return;
  tvFullscreenPlaybackWatchSegment(watchedSec);
}

export function trackTvFullscreenVideoComplete(
  ctx: TvFullscreenAnalyticsContext,
  _mode: TvAnalyticsClipMode = "LOCAL"
): void {
  if (!isTvFullscreenSdkCollectionActive() || !ctx.channelId) return;
  tvFullscreenPlaybackComplete();
  void flushSdkAnalytics({ ctx: buildSdkContext(ctx), auth: {} });
}
