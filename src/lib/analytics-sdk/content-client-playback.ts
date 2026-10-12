import { createLocalSurfacePlayback } from "./local-surface-playback";

const impl = createLocalSurfacePlayback({
  surface: "content_client",
  encounterItemIdForEvent: eventId => `content-client-${eventId}`,
});

export const resetContentClientPlaybackForTests = impl.resetForTests;
export const contentClientPlaybackOnVideoLoaded = impl.onVideoLoaded;
export const contentClientPlaybackOnPlayStateChange = impl.onPlayStateChange;
export const contentClientPlaybackWatchSegment = impl.watchSegment;
export const contentClientPlaybackComplete = impl.complete;
