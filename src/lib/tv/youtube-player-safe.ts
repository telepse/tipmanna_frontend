/** YouTube IFrame player with optional getIframe (YT.Player). */
type YtPlayerLike = {
  getIframe?: () => HTMLIFrameElement | null | undefined;
  getCurrentTime?: () => number;
};

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
