import { getAnalyticsSessionId, getDeviceCategory } from "../analytics-session";
import {
  channelClientPlaybackComplete,
  channelClientPlaybackOnPlayStateChange,
  channelClientPlaybackOnVideoLoaded,
  channelClientPlaybackWatchSegment,
} from "../analytics-sdk/channel-client-playback";
import { flushSdkAnalytics } from "../analytics-sdk/transport";
import {
  initAnalyticsSdkRuntime,
  setAnalyticsSdkRuntimeContext,
  shutdownAnalyticsSdkRuntime,
} from "../analytics-sdk/runtime";
import { isChannelClientSdkCollectionActive } from "../analytics-sdk/surface-flags";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  setTvAnalyticsContext,
  shutdownTvAnalyticsRuntime,
  trackTvVideoComplete,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "../tvAnalytics";
import type { TvAnalyticsClipMode } from "../analytics-types";

export type ChannelClientAnalyticsContext = {
  eventId: string;
  channelId: string | null;
  communityId: string | null;
};

export function initChannelClientAnalyticsRuntime(): void {
  if (isChannelClientSdkCollectionActive()) {
    initAnalyticsSdkRuntime();
  } else {
    initTvAnalyticsRuntime();
  }
}

export function shutdownChannelClientAnalyticsRuntime(): void {
  if (isChannelClientSdkCollectionActive()) {
    shutdownAnalyticsSdkRuntime();
  } else {
    shutdownTvAnalyticsRuntime();
  }
}

export async function flushChannelClientAnalyticsBeforeContext(
  partial: ChannelClientAnalyticsContext
): Promise<void> {
  if (isChannelClientSdkCollectionActive()) {
    const ctx = buildSdkContext(partial);
    if (ctx) {
      await flushSdkAnalytics({ ctx, auth: {} });
    }
  } else {
    await flushTvAnalytics();
  }
}

function buildSdkContext(partial: ChannelClientAnalyticsContext | null) {
  const eventId = partial?.eventId;
  if (!eventId) return null;
  return {
    sessionId: getAnalyticsSessionId(),
    surface: "channel_client" as const,
    eventId,
    deviceCategory: getDeviceCategory(),
    ...(partial.channelId ? { videoChannelId: partial.channelId } : {}),
    ...(partial.communityId ? { communityId: partial.communityId } : {}),
  };
}

export function setChannelClientAnalyticsContext(
  partial: ChannelClientAnalyticsContext
): void {
  if (isChannelClientSdkCollectionActive()) {
    const ctx = buildSdkContext(partial);
    if (ctx) setAnalyticsSdkRuntimeContext(ctx);
  } else {
    setTvAnalyticsContext({
      eventId: partial.eventId,
      channelId: partial.channelId,
      surface: "channel_client",
      communityId: partial.communityId,
    });
  }
}

export function trackChannelClientVideoEncounter(
  eventId: string,
  opts: {
    channelId: string;
    scheduleIndex: number;
    isPlaying: boolean;
    communityId: string | null;
  }
): void {
  if (isChannelClientSdkCollectionActive()) {
    channelClientPlaybackOnVideoLoaded({
      eventId,
      videoChannelId: opts.channelId,
      communityId: opts.communityId,
      scheduleIndex: opts.scheduleIndex,
      isPlaying: opts.isPlaying,
    });
    return;
  }
  trackTvVideoEncounter(`channel-client-${eventId}`, {
    channelId: opts.channelId,
    mode: "LOCAL",
    scheduleIndex: opts.scheduleIndex,
  });
}

export function trackChannelClientVideoStart(
  channelId: string,
  scheduleIndex: number
): void {
  if (isChannelClientSdkCollectionActive()) {
    channelClientPlaybackOnPlayStateChange(true, scheduleIndex);
    return;
  }
  trackTvVideoStart(channelId, "LOCAL", scheduleIndex, channelId);
}

export function trackChannelClientWatchDuration(
  channelId: string,
  watchedSec: number,
  _mode: TvAnalyticsClipMode,
  _channelId?: string
): void {
  if (isChannelClientSdkCollectionActive()) {
    channelClientPlaybackWatchSegment(watchedSec);
    return;
  }
  trackTvWatchDuration(channelId, watchedSec, "LOCAL", channelId);
}

export function trackChannelClientVideoComplete(
  channelId: string,
  _opts?: { channelId?: string; mode?: TvAnalyticsClipMode }
): void {
  if (isChannelClientSdkCollectionActive()) {
    channelClientPlaybackComplete();
    void flushSdkAnalytics({
      ctx: {
        sessionId: getAnalyticsSessionId(),
        surface: "channel_client",
        videoChannelId: channelId,
      },
      auth: {},
    });
    return;
  }
  trackTvVideoComplete(channelId, { channelId, mode: "LOCAL" });
}
