import type { PaymentSurface, TvAnalyticsClipMode } from "../analytics-types";
import { getAnalyticsSessionId, getDeviceCategory } from "../analytics-session";
import {
  communityFeaturedOverlayPlaybackComplete,
  communityFeaturedOverlayPlaybackOnPlayStateChange,
  communityFeaturedOverlayPlaybackOnOpen,
  communityFeaturedOverlayPlaybackWatchSegment,
} from "../analytics-sdk/community-featured-overlay-playback";
import {
  contentClientPlaybackComplete,
  contentClientPlaybackOnPlayStateChange,
  contentClientPlaybackOnVideoLoaded,
  contentClientPlaybackWatchSegment,
} from "../analytics-sdk/content-client-playback";
import { flushSdkAnalytics } from "../analytics-sdk/transport";
import {
  initAnalyticsSdkRuntime,
  setAnalyticsSdkRuntimeContext,
  shutdownAnalyticsSdkRuntime,
} from "../analytics-sdk/runtime";
import {
  isCommunityFeaturedOverlaySdkCollectionActive,
  isContentClientSdkCollectionActive,
} from "../analytics-sdk/surface-flags";
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

export type ContentClientAnalyticsContext = {
  eventId: string;
  channelId: string | null;
  communityId: string | null;
  /** Defaults to content_client; community join overlay uses community_featured_overlay. */
  surface?: PaymentSurface;
};

function resolveSurface(ctx: ContentClientAnalyticsContext): PaymentSurface {
  return ctx.surface ?? "content_client";
}

function sdkActive(ctx: ContentClientAnalyticsContext): boolean {
  const surface = resolveSurface(ctx);
  if (surface === "community_featured_overlay") {
    return isCommunityFeaturedOverlaySdkCollectionActive();
  }
  return isContentClientSdkCollectionActive();
}

export function initContentClientAnalyticsRuntime(
  surface: PaymentSurface = "content_client"
): void {
  const active =
    surface === "community_featured_overlay"
      ? isCommunityFeaturedOverlaySdkCollectionActive()
      : isContentClientSdkCollectionActive();
  if (active) {
    initAnalyticsSdkRuntime();
  } else {
    initTvAnalyticsRuntime();
  }
}

export function shutdownContentClientAnalyticsRuntime(
  surface: PaymentSurface = "content_client"
): void {
  const active =
    surface === "community_featured_overlay"
      ? isCommunityFeaturedOverlaySdkCollectionActive()
      : isContentClientSdkCollectionActive();
  if (active) {
    shutdownAnalyticsSdkRuntime();
  } else {
    shutdownTvAnalyticsRuntime();
  }
}

export async function flushContentClientAnalyticsBeforeContext(
  partial: ContentClientAnalyticsContext
): Promise<void> {
  if (sdkActive(partial)) {
    const ctx = buildSdkContext(partial);
    if (ctx) {
      await flushSdkAnalytics({ ctx, auth: {} });
    }
  } else {
    await flushTvAnalytics();
  }
}

function buildSdkContext(partial: ContentClientAnalyticsContext | null) {
  const eventId = partial?.eventId;
  if (!eventId) return null;
  const surface = partial ? resolveSurface(partial) : "content_client";
  return {
    sessionId: getAnalyticsSessionId(),
    surface,
    eventId,
    deviceCategory: getDeviceCategory(),
    ...(partial.channelId ? { videoChannelId: partial.channelId } : {}),
    ...(partial.communityId ? { communityId: partial.communityId } : {}),
  };
}

export function setContentClientAnalyticsContext(
  partial: ContentClientAnalyticsContext
): void {
  const surface = resolveSurface(partial);
  if (sdkActive(partial)) {
    const ctx = buildSdkContext(partial);
    if (ctx) setAnalyticsSdkRuntimeContext(ctx);
  } else {
    setTvAnalyticsContext({
      eventId: partial.eventId,
      channelId: partial.channelId,
      surface,
      communityId: partial.communityId,
    });
  }
}

export function trackContentClientVideoEncounter(
  eventId: string,
  opts: {
    channelId: string;
    scheduleIndex: number;
    isPlaying: boolean;
    communityId: string | null;
    surface?: PaymentSurface;
  }
): void {
  const ctx: ContentClientAnalyticsContext = {
    eventId,
    channelId: opts.channelId,
    communityId: opts.communityId,
    surface: opts.surface,
  };
  if (sdkActive(ctx)) {
    if (resolveSurface(ctx) === "community_featured_overlay") {
      communityFeaturedOverlayPlaybackOnOpen({
        eventId,
        videoChannelId: opts.channelId,
        communityId: opts.communityId,
        scheduleIndex: opts.scheduleIndex,
        isPlaying: opts.isPlaying,
      });
    } else {
      contentClientPlaybackOnVideoLoaded({
        eventId,
        videoChannelId: opts.channelId,
        communityId: opts.communityId,
        scheduleIndex: opts.scheduleIndex,
        isPlaying: opts.isPlaying,
      });
    }
    return;
  }
  trackTvVideoEncounter(`content-client-${eventId}`, {
    channelId: opts.channelId,
    mode: "LOCAL",
    scheduleIndex: opts.scheduleIndex,
  });
}

export function trackContentClientVideoStart(
  channelId: string,
  scheduleIndex: number,
  surface: PaymentSurface = "content_client"
): void {
  const ctx: ContentClientAnalyticsContext = {
    eventId: "",
    channelId,
    communityId: null,
    surface,
  };
  if (sdkActive(ctx)) {
    if (surface === "community_featured_overlay") {
      communityFeaturedOverlayPlaybackOnPlayStateChange(true, scheduleIndex);
    } else {
      contentClientPlaybackOnPlayStateChange(true, scheduleIndex);
    }
    return;
  }
  trackTvVideoStart(channelId, "LOCAL", scheduleIndex, channelId);
}

export function trackContentClientWatchDuration(
  channelId: string,
  watchedSec: number,
  _mode: TvAnalyticsClipMode,
  _channelId?: string,
  surface: PaymentSurface = "content_client"
): void {
  const ctx: ContentClientAnalyticsContext = {
    eventId: "",
    channelId,
    communityId: null,
    surface,
  };
  if (sdkActive(ctx)) {
    if (surface === "community_featured_overlay") {
      communityFeaturedOverlayPlaybackWatchSegment(watchedSec);
    } else {
      contentClientPlaybackWatchSegment(watchedSec);
    }
    return;
  }
  trackTvWatchDuration(channelId, watchedSec, "LOCAL", channelId);
}

export function trackContentClientVideoComplete(
  channelId: string,
  opts?: {
    channelId?: string;
    mode?: TvAnalyticsClipMode;
    surface?: PaymentSurface;
    eventId?: string;
    communityId?: string | null;
  }
): void {
  const surface = opts?.surface ?? "content_client";
  const ctx: ContentClientAnalyticsContext = {
    eventId: opts?.eventId ?? "",
    channelId,
    communityId: opts?.communityId ?? null,
    surface,
  };
  if (sdkActive(ctx)) {
    if (surface === "community_featured_overlay") {
      communityFeaturedOverlayPlaybackComplete();
    } else {
      contentClientPlaybackComplete();
    }
    void flushSdkAnalytics({
      ctx: {
        sessionId: getAnalyticsSessionId(),
        surface,
        videoChannelId: channelId,
        ...(opts?.eventId ? { eventId: opts.eventId } : {}),
      },
      auth: {},
    });
    return;
  }
  trackTvVideoComplete(channelId, { channelId, mode: "LOCAL" });
}
