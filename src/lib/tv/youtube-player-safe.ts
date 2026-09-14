/** YouTube IFrame player with optional getIframe (YT.Player). */
type YtPlayerLike = {
  getIframe?: () => HTMLIFrameElement | null | undefined;
  getCurrentTime?: () => number;
  playVideo?: () => void;
  pauseVideo?: () => void;
};

/** True when imperative playback APIs are present (post-destroy players may lack them). */
export function hasYoutubePlaybackApi(
  player: YtPlayerLike | null | undefined
): player is YtPlayerLike & {
  playVideo: () => void;
  pauseVideo: () => void;
} {
  return (
    !!player &&
    typeof player.playVideo === "function" &&
    typeof player.pauseVideo === "function"
  );
}

export function isYoutubePlayerIframeLive(
  player: YtPlayerLike | null | undefined
): boolean {
  if (!player || typeof player.getIframe !== "function") return false;
  try {
    const iframe = player.getIframe();
    return (
      iframe instanceof HTMLIFrameElement &&
      typeof document !== "undefined" &&
      document.contains(iframe)
    );
  } catch {
    return false;
  }
}

/**
 * True when imperative play/pause/load may be issued.
 * Matches Explore: playback API on the live YT.Player instance — not YouTube onReady.
 */
export function isYoutubePlayerCommandReady(
  player: YtPlayerLike | null | undefined
): boolean {
  return hasYoutubePlaybackApi(player);
}

/** @deprecated Prefer isYoutubePlayerCommandReady for play orchestration. */
export function isYoutubePlayerApiReady(
  readyFlag: boolean,
  player: YtPlayerLike | null | undefined
): boolean {
  return (
    readyFlag &&
    !!player &&
    typeof player.getCurrentTime === "function" &&
    isYoutubePlayerIframeLive(player)
  );
}

export function safeYoutubeCall<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
