import { createLocalSurfacePlayback } from "./local-surface-playback";

const impl = createLocalSurfacePlayback({
  surface: "tv_fullscreen",
  encounterItemIdForEvent: () => "tv-fullscreen-route",
});

export const resetTvFullscreenPlaybackForTests = impl.resetForTests;
export const tvFullscreenPlaybackOnVideoLoaded = impl.onVideoLoaded;
export const tvFullscreenPlaybackOnPlayStateChange = impl.onPlayStateChange;
export const tvFullscreenPlaybackWatchSegment = impl.watchSegment;
export const tvFullscreenPlaybackComplete = impl.complete;
