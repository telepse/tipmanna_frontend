import { createLocalSurfacePlayback } from "./local-surface-playback";

const impl = createLocalSurfacePlayback({
  surface: "tiplink",
  encounterItemIdForEvent: eventId => `tiplink-${eventId}`,
});

export const resetTiplinkPlaybackForTests = impl.resetForTests;
export const tiplinkPlaybackOnPlayStateChange = impl.onPlayStateChange;
export const tiplinkPlaybackWatchSegment = impl.watchSegment;
export const tiplinkPlaybackComplete = impl.complete;

/** Slug-based encounter id (legacy tiplink item id). */
export function tiplinkPlaybackOnEncounter(params: {
  eventId: string;
  videoChannelId: string;
  communityId: string | null;
  encounterItemId: string;
  isPlaying: boolean;
}): void {
  impl.onVideoLoaded({
    eventId: params.eventId,
    videoChannelId: params.videoChannelId,
    communityId: params.communityId,
    scheduleIndex: 0,
    isPlaying: params.isPlaying,
    encounterItemId: params.encounterItemId,
  });
}
