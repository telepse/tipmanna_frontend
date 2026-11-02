import type { PaymentSurface, TvAnalyticsClipMode } from "../analytics-types";
import { getAnalyticsSessionId, getDeviceCategory } from "../analytics-session";
import { tvSurfacePlaybackFor } from "../analytics-sdk/tv-surface-playback";
import { flushSdkAnalytics } from "../analytics-sdk/transport";
import {
  initAnalyticsSdkRuntime,
  setAnalyticsSdkRuntimeContext,
} from "../analytics-sdk/runtime";
import {
  isCommunityFeedSdkCollectionActive,
  isExploreFeedSdkCollectionActive,
  isExplorePlaybackSdkCollectionActive,
  isExploreWatchDurationCollectionActive,
} from "../analytics-sdk/surface-flags";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  setTvAnalyticsContext,
  trackTvVideoComplete,
  trackTvVideoEnd,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "../tvAnalytics";

export type ExploreFeedAnalyticsContext = {
  eventId: string | null;
  channelId: string | null;
  communityId: string | null;
  analyticsSurface: PaymentSurface;
};

export function resolveExploreFeedAnalyticsSurface(
  feedMode: "trends" | "saves" | "community" | undefined
): PaymentSurface {
  return feedMode === "community" ? "community_feed" : "explore_feed";
}

export function isExploreFeedWatchDurationEnabled(): boolean {
  return isExploreWatchDurationCollectionActive();
}

export function initExploreFeedAnalyticsRuntime(): void {
  if (
    isExploreFeedSdkCollectionActive() ||
    isCommunityFeedSdkCollectionActive()
  ) {
    initAnalyticsSdkRuntime();
  } else {
    initTvAnalyticsRuntime();
  }
}

function buildSdkContext(ctx: ExploreFeedAnalyticsContext) {
  return {
    sessionId: getAnalyticsSessionId(),
    surface: ctx.analyticsSurface,
    deviceCategory: getDeviceCategory(),
    ...(ctx.eventId ? { eventId: ctx.eventId } : {}),
    ...(ctx.channelId ? { videoChannelId: ctx.channelId } : {}),
    ...(ctx.communityId ? { communityId: ctx.communityId } : {}),
  };
}

export async function flushExploreFeedAnalyticsBeforeContext(
  ctx: ExploreFeedAnalyticsContext
): Promise<void> {
  if (isExplorePlaybackSdkCollectionActive(ctx.analyticsSurface)) {
    await flushSdkAnalytics({ ctx: buildSdkContext(ctx), auth: {} });
    return;
  }
  await flushTvAnalytics();
}

export function setExploreFeedAnalyticsContext(
  ctx: ExploreFeedAnalyticsContext
): void {
  if (isExplorePlaybackSdkCollectionActive(ctx.analyticsSurface)) {
    setAnalyticsSdkRuntimeContext(buildSdkContext(ctx));
    return;
  }
  setTvAnalyticsContext({
    eventId: ctx.eventId,
    channelId: ctx.channelId,
    surface: ctx.analyticsSurface,
    communityId: ctx.communityId,
  });
}

export function trackExploreFeedVideoEncounter(
  ctx: ExploreFeedAnalyticsContext,
  opts: {
    scheduleItemId: string;
    channelId: string;
    scheduleIndex: number;
  }
): void {
  if (isExplorePlaybackSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).onVideoReadyEncounter({
      eventId: ctx.eventId,
      videoChannelId: opts.channelId,
      scheduleItemId: opts.scheduleItemId,
      communityId: ctx.communityId,
      scheduleIndex: opts.scheduleIndex,
      mode: "EXPLORE",
    });
    return;
  }
  trackTvVideoEncounter(opts.scheduleItemId, {
    channelId: opts.channelId,
    mode: "EXPLORE",
    scheduleIndex: opts.scheduleIndex,
  });
}

export function trackExploreFeedVideoStart(
  ctx: ExploreFeedAnalyticsContext,
  opts: {
    scheduleItemId: string;
    channelId: string;
    scheduleIndex: number;
  }
): void {
  if (isExplorePlaybackSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).onPlayStart({
      scheduleItemId: opts.scheduleItemId,
      mode: "EXPLORE",
      scheduleIndex: opts.scheduleIndex,
      channelId: opts.channelId,
      eventId: ctx.eventId,
      communityId: ctx.communityId,
    });
    return;
  }
  trackTvVideoStart(
    opts.scheduleItemId,
    "EXPLORE",
    opts.scheduleIndex,
    opts.channelId
  );
}

export function trackExploreFeedVideoEnd(
  ctx: ExploreFeedAnalyticsContext,
  opts: {
    scheduleItemId: string;
    watchDurationSec: number;
    endReason: "ended" | "interrupted" | "slot_change" | "unknown";
    channelId?: string;
  }
): void {
  if (isExplorePlaybackSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).onVideoEnd({
      scheduleItemId: opts.scheduleItemId,
      watchDurationSec: opts.watchDurationSec,
      endReason: opts.endReason,
      mode: "EXPLORE",
      channelId: opts.channelId,
    });
  } else {
    trackTvVideoEnd(
      opts.scheduleItemId,
      opts.watchDurationSec,
      opts.endReason,
      "EXPLORE",
      opts.channelId
    );
  }
  trackExploreFeedWatchDurationIfEnabled(ctx, {
    scheduleItemId: opts.scheduleItemId,
    watchedSec: opts.watchDurationSec,
    channelId: opts.channelId,
  });
}

/** No-op when `NEXT_PUBLIC_ANALYTICS_EXPLORE_DURATION` is off (legacy prod default). */
/** Elapsed watch on the active reel (requires EXPLORE_DURATION + v2 surface flag). */
export function emitExploreFeedElapsedWatchDuration(
  ctx: ExploreFeedAnalyticsContext,
  opts: {
    scheduleItemId: string;
    segmentStartMs: number;
    channelId?: string;
  }
): void {
  if (opts.segmentStartMs <= 0) return;
  const watchedSec = (Date.now() - opts.segmentStartMs) / 1000;
  trackExploreFeedWatchDurationIfEnabled(ctx, {
    scheduleItemId: opts.scheduleItemId,
    watchedSec,
    channelId: opts.channelId,
  });
}

export function trackExploreFeedWatchDurationIfEnabled(
  ctx: ExploreFeedAnalyticsContext,
  opts: {
    scheduleItemId: string;
    watchedSec: number;
    channelId?: string;
  }
): void {
  if (!isExploreWatchDurationCollectionActive()) return;
  if (opts.watchedSec <= 0.3) return;
  const capped = Math.min(opts.watchedSec, 600);
  if (isExplorePlaybackSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).watchSegment({
      scheduleItemId: opts.scheduleItemId,
      watchedSec: capped,
      mode: "EXPLORE",
      channelId: opts.channelId,
    });
    void flushSdkAnalytics({ ctx: buildSdkContext(ctx), auth: {} });
    return;
  }
  trackTvWatchDuration(opts.scheduleItemId, capped, "EXPLORE", opts.channelId);
}

export function trackExploreFeedVideoComplete(
  ctx: ExploreFeedAnalyticsContext,
  opts: {
    scheduleItemId: string;
    channelId: string;
    mode?: TvAnalyticsClipMode;
  }
): void {
  if (isExplorePlaybackSdkCollectionActive(ctx.analyticsSurface)) {
    tvSurfacePlaybackFor(ctx.analyticsSurface).complete({
      scheduleItemId: opts.scheduleItemId,
      mode: opts.mode ?? "EXPLORE",
      channelId: opts.channelId,
    });
    void flushSdkAnalytics({ ctx: buildSdkContext(ctx), auth: {} });
    return;
  }
  trackTvVideoComplete(opts.scheduleItemId, {
    channelId: opts.channelId,
    mode: opts.mode ?? "EXPLORE",
  });
}
