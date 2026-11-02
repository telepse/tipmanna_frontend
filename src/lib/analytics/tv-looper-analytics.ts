import type { PaymentSurface, TvAnalyticsClipMode } from "../analytics-types";
import { getAnalyticsSessionId, getDeviceCategory } from "../analytics-session";
import {
  resetTvSurfacePlaybackEncounterState,
  tvSurfacePlaybackFor,
} from "../analytics-sdk/tv-surface-playback";
import { flushSdkAnalytics } from "../analytics-sdk/transport";
import { setAnalyticsSdkRuntimeContext } from "../analytics-sdk/runtime";
import { isTvSurfaceSdkCollectionActive } from "../analytics-sdk/surface-flags";
import {
  flushTvAnalytics,
  setTvAnalyticsContext,
  trackTvVideoComplete,
  trackTvVideoEnd,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "../tvAnalytics";

export type TvLooperAnalyticsContext = {
  eventId: string | null;
  channelId: string | null | undefined;
  analyticsSurface: PaymentSurface;
  communityId: string | null;
};

/** Immersive /tv chrome maps global looper playback to tv_fullscreen (Wave 3 S7b). */
/** Reset encounter latches when effective TV analytics surface changes (e.g. fullscreen). */
export function resetLooperTvSurfaceEncounterStates(
  _baseSurface: PaymentSurface
): void {
  resetTvSurfacePlaybackEncounterState("tv_looper");
  resetTvSurfacePlaybackEncounterState("tv_fullscreen");
  resetTvSurfacePlaybackEncounterState("community_tv_looper");
}

export function resolveLooperEffectiveAnalyticsSurface(
  base: PaymentSurface,
  opts: { immersive: boolean }
): PaymentSurface {
  if (opts.immersive && base === "tv_looper") {
    return "tv_fullscreen";
  }
  return base;
}

function buildSdkContext(ctx: TvLooperAnalyticsContext) {
  return {
    sessionId: getAnalyticsSessionId(),
    surface: ctx.analyticsSurface,
    deviceCategory: getDeviceCategory(),
    ...(ctx.eventId ? { eventId: ctx.eventId } : {}),
    ...(ctx.channelId ? { videoChannelId: String(ctx.channelId) } : {}),
    ...(ctx.communityId ? { communityId: ctx.communityId } : {}),
  };
}

export async function syncTvLooperAnalyticsContext(
  ctx: TvLooperAnalyticsContext
): Promise<void> {
  setTvAnalyticsContext({
    eventId: ctx.eventId,
    channelId: ctx.channelId ?? null,
    surface: ctx.analyticsSurface,
    communityId: ctx.communityId,
  });

  if (isTvSurfaceSdkCollectionActive(ctx.analyticsSurface)) {
    await flushSdkAnalytics({ ctx: buildSdkContext(ctx), auth: {} });
    setAnalyticsSdkRuntimeContext(buildSdkContext(ctx));
    return;
  }
  await flushTvAnalytics();
}

export function trackTvLooperVideoEncounter(
  ctx: TvLooperAnalyticsContext,
  opts: {
    mode: TvAnalyticsClipMode;
    scheduleIndex: number;
    scheduleItemId: string;
  }
): void {
  if (isTvSurfaceSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).onVideoReadyEncounter({
      eventId: ctx.eventId,
      videoChannelId: ctx.channelId ?? undefined,
      scheduleItemId: opts.scheduleItemId,
      communityId: ctx.communityId,
      scheduleIndex: opts.scheduleIndex,
      mode: opts.mode,
    });
    return;
  }
  trackTvVideoEncounter(`tv-surface-${ctx.analyticsSurface}`, {
    channelId: ctx.channelId ?? undefined,
    mode: opts.mode,
    scheduleIndex: opts.scheduleIndex,
  });
}

export function trackTvLooperVideoStart(
  ctx: TvLooperAnalyticsContext,
  itemId: string,
  mode: TvAnalyticsClipMode,
  scheduleIndex: number,
  channelId?: string
): void {
  if (isTvSurfaceSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).onPlayStart({
      scheduleItemId: itemId,
      mode,
      scheduleIndex,
      channelId,
      eventId: ctx.eventId,
      communityId: ctx.communityId,
    });
    void flushSdkAnalytics({ ctx: buildSdkContext(ctx), auth: {} });
    return;
  }
  trackTvVideoStart(itemId, mode, scheduleIndex, channelId);
}

export function trackTvLooperVideoEnd(
  ctx: TvLooperAnalyticsContext,
  itemId: string,
  watchDurationSec: number,
  endReason: "ended" | "interrupted" | "slot_change" | "unknown",
  mode: TvAnalyticsClipMode,
  channelId?: string
): void {
  if (isTvSurfaceSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).onVideoEnd({
      scheduleItemId: itemId,
      watchDurationSec,
      endReason,
      mode,
      channelId,
    });
    return;
  }
  trackTvVideoEnd(itemId, watchDurationSec, endReason, mode, channelId);
}

export function trackTvLooperWatchDuration(
  ctx: TvLooperAnalyticsContext,
  itemId: string,
  watchedSec: number,
  mode: TvAnalyticsClipMode,
  channelId?: string
): void {
  if (isTvSurfaceSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).watchSegment({
      scheduleItemId: itemId,
      watchedSec,
      mode,
      channelId,
    });
    void flushSdkAnalytics({ ctx: buildSdkContext(ctx), auth: {} });
    return;
  }
  trackTvWatchDuration(itemId, watchedSec, mode, channelId);
}

export function trackTvLooperVideoComplete(
  ctx: TvLooperAnalyticsContext,
  itemId: string,
  opts?: { channelId?: string; mode?: TvAnalyticsClipMode }
): void {
  if (isTvSurfaceSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).complete({
      scheduleItemId: itemId,
      mode: opts?.mode ?? "GLOBAL",
      channelId: opts?.channelId,
    });
    void flushSdkAnalytics({
      ctx: buildSdkContext(ctx),
      auth: {},
    });
    return;
  }
  trackTvVideoComplete(itemId, opts);
}
