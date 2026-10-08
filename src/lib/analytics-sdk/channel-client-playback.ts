import { getAnalyticsSessionId } from "../analytics-session";
import { getOrCreateActivationId, markActivationEnded } from "./activation";
import { mintEventUid } from "./event-uid";
import { enqueueSdkEvents } from "./queue";
import type { SdkPlaybackEventV2 } from "./types";
import { withEventUid } from "./track";

const SURFACE = "channel_client";

type PlaybackCtx = {
  eventId: string;
  videoChannelId: string;
  communityId: string | null;
  scheduleIndex: number;
  encounterItemId: string;
};

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
    SURFACE,
    playbackCtx.videoChannelId,
    mintEventUid
  );
}

function emit(events: SdkPlaybackEventV2[]): void {
  enqueueSdkEvents(events);
}

export function resetChannelClientPlaybackForTests(): void {
  playbackCtx = null;
  ready = false;
  encounterSentForActivation = false;
  startSentForActivation = false;
}

export function channelClientPlaybackOnChannelChange(
  videoChannelId: string
): void {
  if (playbackCtx?.videoChannelId === videoChannelId) return;
  if (playbackCtx) {
    markActivationEnded(sessionId(), SURFACE, playbackCtx.videoChannelId);
  }
  ready = false;
  encounterSentForActivation = false;
  startSentForActivation = false;
}

export function channelClientPlaybackBindContext(params: {
  eventId: string;
  videoChannelId: string;
  communityId: string | null;
  scheduleIndex: number;
}): void {
  if (playbackCtx && playbackCtx.videoChannelId !== params.videoChannelId) {
    channelClientPlaybackOnChannelChange(params.videoChannelId);
  }
  playbackCtx = {
    eventId: params.eventId,
    videoChannelId: params.videoChannelId,
    communityId: params.communityId,
    scheduleIndex: params.scheduleIndex,
    encounterItemId: `channel-client-${params.eventId}`,
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

/** Video ready (loaded); encounter deferred until playing (ready∧active). */
export function channelClientPlaybackOnVideoLoaded(params: {
  eventId: string;
  videoChannelId: string;
  communityId: string | null;
  scheduleIndex: number;
  isPlaying: boolean;
}): void {
  channelClientPlaybackBindContext({
    eventId: params.eventId,
    videoChannelId: params.videoChannelId,
    communityId: params.communityId,
    scheduleIndex: params.scheduleIndex,
  });
  ready = true;
  if (params.isPlaying) {
    tryEmitEncounter();
    tryEmitStart();
  }
}

export function channelClientPlaybackOnPlayStateChange(
  isPlaying: boolean,
  scheduleIndex: number
): void {
  if (!playbackCtx) return;
  playbackCtx.scheduleIndex = scheduleIndex;
  if (!isPlaying) return;
  if (!ready) return;
  tryEmitEncounter();
  tryEmitStart();
}

export function channelClientPlaybackWatchSegment(watchedSec: number): void {
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

export function channelClientPlaybackComplete(): void {
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
  markActivationEnded(sessionId(), SURFACE, ch);
  ready = false;
  encounterSentForActivation = false;
  startSentForActivation = false;
}
