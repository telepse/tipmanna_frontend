import { createLocalSurfacePlayback } from "./local-surface-playback";

const impl = createLocalSurfacePlayback({
  surface: "event_room",
  encounterItemIdForEvent: eventId => `event-room-${eventId}`,
});

export const resetEventRoomPlaybackForTests = impl.resetForTests;
export const eventRoomPlaybackOnVideoLoaded = impl.onVideoLoaded;
export const eventRoomPlaybackOnPlayStateChange = impl.onPlayStateChange;
export const eventRoomPlaybackWatchSegment = impl.watchSegment;
export const eventRoomPlaybackComplete = impl.complete;
