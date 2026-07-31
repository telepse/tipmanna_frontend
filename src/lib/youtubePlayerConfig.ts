/**
 * Shared YouTube IFrame API / react-youtube playerVars.
 * YouTube may still show some UI on pause; iv_load_policy reduces annotations.
 */

export type YoutubeEmbedMode = "chromeless" | "minimal";

const BASE = {
  modestbranding: 1,
  rel: 0,
  iv_load_policy: 3,
  playsinline: 1,
  disablekb: 1,
} as const;

/** Privacy-enhanced YouTube embed host when supported by react-youtube / IFrame API. */
export const YOUTUBE_NO_COOKIE_HOST = "https://www.youtube-nocookie.com";

/** No default YouTube controls — use app UI (scrubbers, TV chrome, etc.). */
export function getYoutubePlayerVarsChromeless(options: {
  autoplay?: boolean;
  mute?: boolean;
  /** Phase C1 — YouTube IFrame API start param (integer seconds, embed-time only). */
  start?: number;
}): Record<string, number | string> {
  const vars: Record<string, number | string> = {
    ...BASE,
    controls: 0,
    fs: 0,
    autoplay: options.autoplay ? 1 : 0,
    mute: options.mute ? 1 : 0,
  };
  if (
    typeof options.start === "number" &&
    Number.isFinite(options.start) &&
    options.start > 0
  ) {
    vars.start = Math.floor(options.start);
  }
  return vars;
}

/** Fallback when embedded controls are required (legacy); still hides annotations / related. */
export function getYoutubePlayerVarsMinimal(options: {
  autoplay?: boolean;
  mute?: boolean;
}): Record<string, number | string> {
  return {
    ...BASE,
    controls: 1,
    autoplay: options.autoplay ? 1 : 0,
    mute: options.mute ? 1 : 0,
  };
}
