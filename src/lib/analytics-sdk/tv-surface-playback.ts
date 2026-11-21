import type { PaymentSurface, TvAnalyticsClipMode } from "../analytics-types";
import { getAnalyticsSessionId } from "../analytics-session";
import { getOrCreateActivationId, markActivationEnded } from "./activation";
import { mintEventUid } from "./event-uid";
import { enqueueSdkEvents } from "./queue";
import type { SdkPlaybackEventV2 } from "./types";
import { withEventUid } from "./track";

type TvPlaybackCtx = {
  eventId: string;
  videoChannelId: string | undefined;
  scheduleItemId: string;
  communityId: string | null;
  scheduleIndex: number;
  mode: TvAnalyticsClipMode;
  encounterItemId: string;
};

export function createTvSurfacePlayback(surface: PaymentSurface) {
  const encounterItemId = `tv-surface-${surface}`;

  let playbackCtx: TvPlaybackCtx | null = null;
  let ready = false;
  let encounterSentForActivation = false;

  function sessionId(): string {
    return getAnalyticsSessionId();
  }

  function activationId(channelKey: string): string | undefined {
    return getOrCreateActivationId(
      sessionId(),
      surface,
      channelKey,
      mintEventUid
    );
  }

  function emit(events: SdkPlaybackEventV2[]): void {
    enqueueSdkEvents(events);
  }

  function resetForTests(): void {
    playbackCtx = null;
    ready = false;
    encounterSentForActivation = false;
  }

  /** Allow re-emitting encounter when analytics surface changes (e.g. tv_looper → tv_fullscreen). */
  function resetEncounterState(): void {
    encounterSentForActivation = false;
  }

  function bindContext(params: {
    eventId: string | null;
    videoChannelId: string | undefined;
    scheduleItemId: string;
    communityId: string | null;
    scheduleIndex: number;
    mode: TvAnalyticsClipMode;
  }): void {
    playbackCtx = {
      eventId: params.eventId ?? "",
      videoChannelId: params.videoChannelId,
      scheduleItemId: params.scheduleItemId,
      communityId: params.communityId,
      scheduleIndex: params.scheduleIndex,
      mode: params.mode,
      encounterItemId,
    };
  }

  function onVideoReadyEncounter(params: {
    eventId: string | null;
    videoChannelId: string | undefined;
    scheduleItemId: string;
    communityId: string | null;
    scheduleIndex: number;
    mode: TvAnalyticsClipMode;
  }): void {
    bindContext(params);
    ready = true;
    if (!playbackCtx || encounterSentForActivation) return;
    const channelKey = params.videoChannelId ?? params.scheduleItemId;
    const act = activationId(channelKey);
    if (!act) return;
    const ev = withEventUid(
      {
        event: "video_encounter",
        ts: Date.now(),
        itemId: encounterItemId,
        ...(params.videoChannelId ? { channelId: params.videoChannelId } : {}),
        mode: params.mode,
        scheduleIndex: params.scheduleIndex,
      },
      act
    );
    emit([ev]);
    encounterSentForActivation = true;
  }

  function onPlayStart(params: {
    scheduleItemId: string;
    mode: TvAnalyticsClipMode;
    scheduleIndex: number;
    channelId?: string;
    eventId: string | null;
    communityId: string | null;
  }): void {
    bindContext({
      eventId: params.eventId,
      videoChannelId: params.channelId,
      scheduleItemId: params.scheduleItemId,
      communityId: params.communityId,
      scheduleIndex: params.scheduleIndex,
      mode: params.mode,
    });
    const channelKey = params.channelId ?? params.scheduleItemId;
    const act = activationId(channelKey);
    const ev = withEventUid(
      {
        event: "video_start",
        ts: Date.now(),
        itemId: params.scheduleItemId,
        ...(params.channelId ? { channelId: params.channelId } : {}),
        mode: params.mode,
        scheduleIndex: params.scheduleIndex,
      },
      act
    );
    emit([ev]);
  }

  function onVideoEnd(params: {
    scheduleItemId: string;
    watchDurationSec: number;
    endReason: "ended" | "interrupted" | "slot_change" | "unknown";
    mode: TvAnalyticsClipMode;
    channelId?: string;
  }): void {
    const channelKey = params.channelId ?? params.scheduleItemId;
    const act = activationId(channelKey);
    const ev = withEventUid(
      {
        event: "video_end",
        ts: Date.now(),
        itemId: params.scheduleItemId,
        ...(params.channelId ? { channelId: params.channelId } : {}),
        watchDurationSec: params.watchDurationSec,
        endReason: params.endReason,
        mode: params.mode,
      },
      act
    );
    emit([ev]);
  }

  function watchSegment(params: {
    scheduleItemId: string;
    watchedSec: number;
    mode: TvAnalyticsClipMode;
    channelId?: string;
  }): void {
    if (params.watchedSec <= 0.3) return;
    const capped = Math.min(params.watchedSec, 600);
    const channelKey = params.channelId ?? params.scheduleItemId;
    const act = activationId(channelKey);
    const ev = withEventUid(
      {
        event: "watch_duration",
        ts: Date.now(),
        itemId: params.scheduleItemId,
        ...(params.channelId ? { channelId: params.channelId } : {}),
        watchedSec: capped,
        mode: params.mode,
      },
      act
    );
    emit([ev]);
  }

  function complete(params: {
    scheduleItemId: string;
    mode: TvAnalyticsClipMode;
    channelId?: string;
  }): void {
    const channelKey = params.channelId ?? params.scheduleItemId;
    const act = activationId(channelKey);
    const ev = withEventUid(
      {
        event: "video_complete",
        ts: Date.now(),
        itemId: params.scheduleItemId,
        ...(params.channelId ? { channelId: params.channelId } : {}),
        mode: params.mode,
      },
      act
    );
    emit([ev]);
    markActivationEnded(sessionId(), surface, channelKey);
    ready = false;
    encounterSentForActivation = false;
  }

  return {
    resetForTests,
    resetEncounterState,
    onVideoReadyEncounter,
    onPlayStart,
    onVideoEnd,
    watchSegment,
    complete,
  };
}

const tvLooperPlayback = createTvSurfacePlayback("tv_looper");
const tvFullscreenPlayback = createTvSurfacePlayback("tv_fullscreen");
const communityTvPlayback = createTvSurfacePlayback("community_tv_looper");
const homepagePreviewPlayback = createTvSurfacePlayback("homepage_preview");
const exploreFeedPlayback = createTvSurfacePlayback("explore_feed");
const communityFeedPlayback = createTvSurfacePlayback("community_feed");

export function tvSurfacePlaybackFor(surface: PaymentSurface) {
  switch (surface) {
    case "community_tv_looper":
      return communityTvPlayback;
    case "tv_fullscreen":
      return tvFullscreenPlayback;
    case "homepage_preview":
      return homepagePreviewPlayback;
    case "explore_feed":
      return exploreFeedPlayback;
    case "community_feed":
      return communityFeedPlayback;
    case "tv_looper":
    default:
      return tvLooperPlayback;
  }
}

export function resetTvSurfacePlaybackForTests(): void {
  tvLooperPlayback.resetForTests();
  tvFullscreenPlayback.resetForTests();
  communityTvPlayback.resetForTests();
  homepagePreviewPlayback.resetForTests();
  exploreFeedPlayback.resetForTests();
  communityFeedPlayback.resetForTests();
}

export function resetTvSurfacePlaybackEncounterState(
  surface: PaymentSurface
): void {
  tvSurfacePlaybackFor(surface).resetEncounterState();
}
