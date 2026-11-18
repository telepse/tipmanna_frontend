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

/**
 * YouTube error 153 = missing HTTP Referer / client identity.
 * Always attach embedding `origin` + `widget_referrer` when known.
 */
export function attachYoutubeEmbedIdentity(
  vars: Record<string, number | string>,
  origin: string = typeof window !== "undefined" ? window.location.origin : ""
): Record<string, number | string> {
  const trimmed = origin.trim();
  if (!trimmed) return { ...vars };
  return {
    ...vars,
    origin: trimmed,
    widget_referrer: trimmed,
  };
}

/** No default YouTube controls — use app UI (scrubbers, TV chrome, etc.). */
export function getYoutubePlayerVarsChromeless(options: {
  autoplay?: boolean;
  mute?: boolean;
  /** Phase C1 — YouTube IFrame API start param (integer seconds, embed-time only). */
  start?: number;
  /** Override embed identity origin (defaults to window.location.origin). */
  origin?: string;
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
  return attachYoutubeEmbedIdentity(vars, options.origin);
}

/** Fallback when embedded controls are required (legacy); still hides annotations / related. */
export function getYoutubePlayerVarsMinimal(options: {
  autoplay?: boolean;
  mute?: boolean;
  origin?: string;
}): Record<string, number | string> {
  return attachYoutubeEmbedIdentity(
    {
      ...BASE,
      controls: 1,
      autoplay: options.autoplay ? 1 : 0,
      mute: options.mute ? 1 : 0,
    },
    options.origin
  );
}
