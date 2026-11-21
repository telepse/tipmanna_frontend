import { createLocalSurfacePlayback } from "./local-surface-playback";

const impl = createLocalSurfacePlayback({
  surface: "community_featured_overlay",
  encounterItemIdForEvent: eventId => `featured-overlay-${eventId}`,
});

export const resetCommunityFeaturedOverlayPlaybackForTests = impl.resetForTests;
export const communityFeaturedOverlayPlaybackOnOpen = impl.onVideoLoaded;
export const communityFeaturedOverlayPlaybackOnPlayStateChange =
  impl.onPlayStateChange;
export const communityFeaturedOverlayPlaybackWatchSegment = impl.watchSegment;
export const communityFeaturedOverlayPlaybackComplete = impl.complete;
