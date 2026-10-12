import type { PaymentSurface } from "../analytics-types";
import { getAnalyticsSessionId } from "../analytics-session";
import { getOrCreateActivationId, markActivationEnded } from "./activation";
import { mintEventUid } from "./event-uid";
import { enqueueSdkEvents } from "./queue";
import type { SdkPlaybackEventV2 } from "./types";
import { withEventUid } from "./track";

export type LocalSurfacePlaybackConfig = {
  surface: PaymentSurface;
  encounterItemIdForEvent: (eventId: string) => string;
};

type PlaybackCtx = {
  eventId: string;
  videoChannelId: string;
  communityId: string | null;
  scheduleIndex: number;
  encounterItemId: string;
};

export function createLocalSurfacePlayback(config: LocalSurfacePlaybackConfig) {
  const { surface, encounterItemIdForEvent } = config;

  let playbackCtx: PlaybackCtx | null = null;
  let ready = false;
  let encounterSentForActivation = false;
  let startSentForActivation = false;

  function sessionId(): string {
    return getAnalyticsSessionId();
  }

  function activationId(): string | undefined {
    if (!playbackCtx) return undefined;
    return getOrCreateActivationId(
      sessionId(),
      surface,
      playbackCtx.videoChannelId,
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
    startSentForActivation = false;
  }

  function onChannelChange(videoChannelId: string): void {
    if (playbackCtx?.videoChannelId === videoChannelId) return;
    if (playbackCtx) {
      markActivationEnded(sessionId(), surface, playbackCtx.videoChannelId);
    }
    ready = false;
    encounterSentForActivation = false;
    startSentForActivation = false;
  }

  function bindContext(params: {
    eventId: string;
    videoChannelId: string;
    communityId: string | null;
    scheduleIndex: number;
    encounterItemId?: string;
  }): void {
    if (playbackCtx && playbackCtx.videoChannelId !== params.videoChannelId) {
      onChannelChange(params.videoChannelId);
    }
    playbackCtx = {
      eventId: params.eventId,
      videoChannelId: params.videoChannelId,
      communityId: params.communityId,
      scheduleIndex: params.scheduleIndex,
      encounterItemId:
        params.encounterItemId ?? encounterItemIdForEvent(params.eventId),
    };
  }

  function tryEmitEncounter(): void {
    if (!playbackCtx || !ready || encounterSentForActivation) return;
    const act = activationId();
    if (!act) return;
    const ev = withEventUid(
      {
        event: "video_encounter",
        ts: Date.now(),
        itemId: playbackCtx.encounterItemId,
        channelId: playbackCtx.videoChannelId,
        mode: "LOCAL",
        scheduleIndex: playbackCtx.scheduleIndex,
      },
      act
    );
    emit([ev]);
    encounterSentForActivation = true;
  }

  function tryEmitStart(): void {
    if (!playbackCtx || startSentForActivation) return;
    const act = activationId();
    if (!act) return;
    const ev = withEventUid(
      {
        event: "video_start",
        ts: Date.now(),
        itemId: playbackCtx.videoChannelId,
        channelId: playbackCtx.videoChannelId,
        mode: "LOCAL",
        scheduleIndex: playbackCtx.scheduleIndex,
      },
      act
    );
    emit([ev]);
    startSentForActivation = true;
  }

  function onVideoLoaded(params: {
    eventId: string;
    videoChannelId: string;
    communityId: string | null;
    scheduleIndex: number;
    isPlaying: boolean;
    encounterItemId?: string;
  }): void {
    bindContext({
      eventId: params.eventId,
      videoChannelId: params.videoChannelId,
      communityId: params.communityId,
      scheduleIndex: params.scheduleIndex,
      encounterItemId: params.encounterItemId,
    });
    ready = true;
    if (params.isPlaying) {
      tryEmitEncounter();
      tryEmitStart();
    }
  }

  function onPlayStateChange(isPlaying: boolean, scheduleIndex: number): void {
    if (!playbackCtx) return;
    playbackCtx.scheduleIndex = scheduleIndex;
    if (!isPlaying) return;
    if (!ready) return;
    tryEmitEncounter();
    tryEmitStart();
  }

  function watchSegment(watchedSec: number): void {
    if (!playbackCtx || watchedSec <= 0) return;
    const act = activationId();
    const capped = Math.min(watchedSec, 600);
    if (capped <= 0.3) return;
    const ev = withEventUid(
      {
        event: "watch_duration",
        ts: Date.now(),
        itemId: playbackCtx.videoChannelId,
        channelId: playbackCtx.videoChannelId,
        watchedSec: capped,
        mode: "LOCAL",
      },
      act
    );
    emit([ev]);
  }

  function complete(): void {
    if (!playbackCtx) return;
    const act = activationId();
    const ch = playbackCtx.videoChannelId;
    const ev = withEventUid(
      {
        event: "video_complete",
        ts: Date.now(),
        itemId: ch,
        channelId: ch,
        mode: "LOCAL",
      },
      act
    );
    emit([ev]);
    markActivationEnded(sessionId(), surface, ch);
    ready = false;
    encounterSentForActivation = false;
    startSentForActivation = false;
  }

  return {
    resetForTests,
    onVideoLoaded,
    onPlayStateChange,
    watchSegment,
    complete,
  };
}
