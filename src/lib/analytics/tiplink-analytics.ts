import { getAnalyticsSessionId, getDeviceCategory } from "../analytics-session";
import {
  tiplinkPlaybackComplete,
  tiplinkPlaybackOnEncounter,
  tiplinkPlaybackOnPlayStateChange,
  tiplinkPlaybackWatchSegment,
} from "../analytics-sdk/tiplink-playback";
import { flushSdkAnalytics } from "../analytics-sdk/transport";
import {
  initAnalyticsSdkRuntime,
  setAnalyticsSdkRuntimeContext,
} from "../analytics-sdk/runtime";
import { isTiplinkSdkCollectionActive } from "../analytics-sdk/surface-flags";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  setTvAnalyticsContext,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "../tvAnalytics";
import type { TvAnalyticsClipMode } from "../analytics-types";

export type TiplinkAnalyticsContext = {
  eventId: string;
  channelId: string;
  communityId: string | null;
};

export function initTiplinkAnalyticsRuntime(): void {
  if (isTiplinkSdkCollectionActive()) {
    initAnalyticsSdkRuntime();
  } else {
    initTvAnalyticsRuntime();
  }
}

export async function flushTiplinkAnalyticsBeforeContext(
  partial: TiplinkAnalyticsContext
): Promise<void> {
  if (isTiplinkSdkCollectionActive()) {
    const ctx = buildSdkContext(partial);
    if (ctx) {
      await flushSdkAnalytics({ ctx, auth: {} });
    }
  } else {
    await flushTvAnalytics();
  }
}

function buildSdkContext(partial: TiplinkAnalyticsContext) {
  return {
    sessionId: getAnalyticsSessionId(),
    surface: "tiplink" as const,
    eventId: partial.eventId,
    deviceCategory: getDeviceCategory(),
    videoChannelId: partial.channelId,
    ...(partial.communityId ? { communityId: partial.communityId } : {}),
  };
}

export function setTiplinkAnalyticsContext(
  partial: TiplinkAnalyticsContext
): void {
  if (isTiplinkSdkCollectionActive()) {
    setAnalyticsSdkRuntimeContext(buildSdkContext(partial));
  } else {
    setTvAnalyticsContext({
      eventId: partial.eventId,
      channelId: partial.channelId,
      surface: "tiplink",
      communityId: partial.communityId,
    });
  }
}

export function trackTiplinkVideoEncounter(
  tipLinkSlug: string,
  opts: {
    eventId: string;
    channelId: string;
    communityId: string | null;
    isPlaying: boolean;
  }
): void {
  if (isTiplinkSdkCollectionActive()) {
    tiplinkPlaybackOnEncounter({
      eventId: opts.eventId,
      videoChannelId: opts.channelId,
      communityId: opts.communityId,
      encounterItemId: `tiplink-${tipLinkSlug}`,
      isPlaying: opts.isPlaying,
    });
    return;
  }
  trackTvVideoEncounter(`tiplink-${tipLinkSlug}`, {
    channelId: opts.channelId,
    mode: "LOCAL",
    scheduleIndex: 0,
  });
}

export function trackTiplinkVideoStart(channelId: string): void {
  if (isTiplinkSdkCollectionActive()) {
    tiplinkPlaybackOnPlayStateChange(true, 0);
    return;
  }
  trackTvVideoStart(channelId, "LOCAL", 0, channelId);
}

export function trackTiplinkWatchDuration(
  channelId: string,
  watchedSec: number,
  _mode: TvAnalyticsClipMode,
  _channelId?: string
): void {
  if (isTiplinkSdkCollectionActive()) {
    tiplinkPlaybackWatchSegment(watchedSec);
    return;
  }
  trackTvWatchDuration(channelId, watchedSec, "LOCAL", channelId);
}

export function trackTiplinkVideoComplete(channelId: string): void {
  if (isTiplinkSdkCollectionActive()) {
    tiplinkPlaybackComplete();
    void flushSdkAnalytics({
      ctx: {
        sessionId: getAnalyticsSessionId(),
        surface: "tiplink",
        videoChannelId: channelId,
      },
      auth: {},
    });
  }
}
