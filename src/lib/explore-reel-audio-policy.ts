/**
 * Pure Explore reel audio policy (platform split for iOS WebKit vs others).
 */

export type DeferProgrammaticUnmuteOptions = {
  /** Injected for tests; defaults to navigator.maxTouchPoints. */
  maxTouchPoints?: number;
  /**
   * Injected for tests. Defaults to `"ontouchend" in document` (same iPad
   * desktop-UA signal as `pwa-utils.isIosSafariNonStandalone`).
   */
  ontouchendInDocument?: boolean;
};

/**
 * True on iPhone / iPod / iPad, including iPads that report a desktop Mac UA
 * when the document supports touch (`ontouchend`). Aligned with `pwa-utils`.
 */
export function shouldDeferProgrammaticUnmute(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
  options: DeferProgrammaticUnmuteOptions = {}
): boolean {
  const isIphoneIpod = /iPhone|iPod/i.test(ua);
  const isIpadClassic = /iPad/i.test(ua);
  const ontouchend =
    options.ontouchendInDocument ??
    (typeof document !== "undefined" && "ontouchend" in document);
  const isIpadDesktop = ua.includes("Mac") && ontouchend;
  return isIphoneIpod || isIpadClassic || isIpadDesktop;
}

export function resolveExploreReelPlayerAudioProps(input: {
  defer: boolean;
  wantsSound: boolean;
}): {
  initialMuted: boolean;
  restoreSessionSoundOnProgrammaticPlay: boolean;
} {
  const { defer, wantsSound } = input;
  return {
    initialMuted: defer || !wantsSound,
    restoreSessionSoundOnProgrammaticPlay: !defer,
  };
}

export type ExploreReelTapAction =
  | "play_and_unmute"
  | "unmute_and_engage"
  | "toggle_pause";

export function resolveExploreReelTapAction(input: {
  hasReachedPlaying: boolean;
  engagedThisReel: boolean;
  playerMuted: boolean;
}): ExploreReelTapAction {
  const { hasReachedPlaying, engagedThisReel, playerMuted } = input;
  if (!hasReachedPlaying) return "play_and_unmute";
  if (!engagedThisReel && playerMuted) return "unmute_and_engage";
  return "toggle_pause";
}

export function shouldShowExploreTapForSound(input: {
  defer: boolean;
  wantsSound: boolean;
  playerMuted: boolean;
  isPlaying: boolean;
  showTapToPlay: boolean;
}): boolean {
  const { defer, wantsSound, playerMuted, isPlaying, showTapToPlay } = input;
  if (!defer || !wantsSound || !playerMuted || !isPlaying) return false;
  if (showTapToPlay) return false;
  return true;
}
