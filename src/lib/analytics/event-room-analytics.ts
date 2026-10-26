import { getAnalyticsSessionId, getDeviceCategory } from "../analytics-session";
import {
  eventRoomPlaybackComplete,
  eventRoomPlaybackOnPlayStateChange,
  eventRoomPlaybackOnVideoLoaded,
  eventRoomPlaybackWatchSegment,
} from "../analytics-sdk/event-room-playback";
import { flushSdkAnalytics } from "../analytics-sdk/transport";
import {
  initAnalyticsSdkRuntime,
  setAnalyticsSdkRuntimeContext,
} from "../analytics-sdk/runtime";
import { isEventRoomSdkCollectionActive } from "../analytics-sdk/surface-flags";
import {
  flushTvAnalytics,
  initTvAnalyticsRuntime,
  setTvAnalyticsContext,
  trackTvVideoComplete,
  trackTvVideoEncounter,
  trackTvVideoStart,
  trackTvWatchDuration,
} from "../tvAnalytics";
import type { TvAnalyticsClipMode } from "../analytics-types";

export type EventRoomAnalyticsContext = {
  eventId: string;
  channelId: string | null;
};

export function initEventRoomAnalyticsRuntime(): void {
  if (isEventRoomSdkCollectionActive()) {
    initAnalyticsSdkRuntime();
  } else {
    initTvAnalyticsRuntime();
  }
}

export async function flushEventRoomAnalyticsBeforeContext(
  partial: EventRoomAnalyticsContext
): Promise<void> {
  if (isEventRoomSdkCollectionActive()) {
    const ctx = buildSdkContext(partial);
    if (ctx) {
      await flushSdkAnalytics({ ctx, auth: {} });
    }
  } else {
    await flushTvAnalytics();
  }
}

function buildSdkContext(partial: EventRoomAnalyticsContext | null) {
  const eventId = partial?.eventId;
  if (!eventId) return null;
  return {
    sessionId: getAnalyticsSessionId(),
    surface: "event_room" as const,
    eventId,
    deviceCategory: getDeviceCategory(),
    ...(partial.channelId ? { videoChannelId: partial.channelId } : {}),
  };
}

export function setEventRoomAnalyticsContext(
  partial: EventRoomAnalyticsContext
): void {
  if (isEventRoomSdkCollectionActive()) {
    const ctx = buildSdkContext(partial);
    if (ctx) setAnalyticsSdkRuntimeContext(ctx);
  } else {
    setTvAnalyticsContext({
      eventId: partial.eventId,
      channelId: partial.channelId,
      surface: "event_room",
    });
  }
}

export function trackEventRoomVideoEncounter(
  eventId: string,
  opts: { channelId: string; scheduleIndex: number }
): void {
  if (isEventRoomSdkCollectionActive()) {
    eventRoomPlaybackOnVideoLoaded({
      eventId,
      videoChannelId: opts.channelId,
      communityId: null,
      scheduleIndex: opts.scheduleIndex,
      isPlaying: true,
    });
    return;
  }
  trackTvVideoEncounter(`event-room-${eventId}`, {
    channelId: opts.channelId,
    mode: "LOCAL",
    scheduleIndex: opts.scheduleIndex,
  });
}

export function trackEventRoomVideoStart(
  channelId: string,
  scheduleIndex: number
): void {
  if (isEventRoomSdkCollectionActive()) {
    eventRoomPlaybackOnPlayStateChange(true, scheduleIndex);
    return;
  }
  trackTvVideoStart(`room-${channelId}`, "LOCAL", scheduleIndex, channelId);
}

export function trackEventRoomWatchDuration(
  channelId: string,
  watchedSec: number,
  _mode: TvAnalyticsClipMode,
  _legacyChannelId?: string
): void {
  if (isEventRoomSdkCollectionActive()) {
    eventRoomPlaybackWatchSegment(watchedSec);
    void flushSdkAnalytics({
      ctx: {
        sessionId: getAnalyticsSessionId(),
        surface: "event_room",
        deviceCategory: getDeviceCategory(),
        videoChannelId: channelId,
      },
      auth: {},
    });
    return;
  }
  trackTvWatchDuration(`room-${channelId}`, watchedSec, "LOCAL", channelId);
}

export function trackEventRoomVideoComplete(channelId: string): void {
  if (isEventRoomSdkCollectionActive()) {
    eventRoomPlaybackComplete();
    void flushSdkAnalytics({
      ctx: {
        sessionId: getAnalyticsSessionId(),
        surface: "event_room",
        videoChannelId: channelId,
      },
      auth: {},
    });
    return;
  }
  trackTvVideoComplete(`room-${channelId}`, {
    channelId,
    mode: "LOCAL",
  });
}
