/**
 * TipLink-local audio / in-app browser policy.
 * TipLink-owned copy of iOS WebKit signals (aligned with pwa-utils); no Explore module imports.
 */

export type TipLinkDeferOptions = {
  /** Injected for tests. Defaults to `"ontouchend" in document`. */
  ontouchendInDocument?: boolean;
};

/** sessionStorage key to dismiss the Open-in-browser banner (per tab). */
export const TIPLINK_OPEN_BROWSER_BANNER_DISMISS_KEY =
  "tipmanna_tiplink_open_browser_banner_dismissed";

/**
 * True for Instagram / Facebook / TikTok / X in-app browsers.
 * Never matches Twitterbot (link-preview crawler).
 */
export function isSocialInAppBrowser(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""
): boolean {
  if (!ua) return false;
  if (/Twitterbot/i.test(ua)) return false;
  if (/Instagram/i.test(ua)) return true;
  if (/FBAN|FBAV/i.test(ua)) return true;
  if (/TikTok|BytedanceWebview|musical_ly/i.test(ua)) return true;
  if (/Twitter for (iPhone|iPad)/i.test(ua)) return true;
  if (/TwitterAndroid/i.test(ua)) return true;
  return false;
}

/**
 * iPhone / iPod / iPad, including iPads that report a desktop Mac UA with touch.
 * Same UA/touch signals as pwa-utils; TipLink keeps its own copy for lock isolation.
 */
export function isTipLinkIosWebKit(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
  options: TipLinkDeferOptions = {}
): boolean {
  const isIphoneIpod = /iPhone|iPod/i.test(ua);
  const isIpadClassic = /iPad/i.test(ua);
  const ontouchend =
    options.ontouchendInDocument ??
    (typeof document !== "undefined" && "ontouchend" in document);
  const isIpadDesktop = ua.includes("Mac") && ontouchend;
  return isIphoneIpod || isIpadClassic || isIpadDesktop;
}

/** Defer programmatic unmute on iOS/iPadOS or social in-app browsers. */
export function shouldDeferTipLinkProgrammaticUnmute(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
  options: TipLinkDeferOptions = {}
): boolean {
  return isTipLinkIosWebKit(ua, options) || isSocialInAppBrowser(ua);
}

export function resolveTipLinkPlayerAudioProps(input: {
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

export type TipLinkSurfaceTapAction =
  | "scroll_to_video"
  | "unmute"
  | "toggle_pause";

export function resolveTipLinkSurfaceTapAction(input: {
  isDocked: boolean;
  playerMuted: boolean;
}): TipLinkSurfaceTapAction {
  if (input.isDocked) return "scroll_to_video";
  if (input.playerMuted) return "unmute";
  return "toggle_pause";
}

export function shouldShowTipLinkTapForSound(input: {
  playerMuted: boolean;
  isPlaying: boolean;
  isDocked: boolean;
}): boolean {
  if (input.isDocked) return false;
  return input.playerMuted && input.isPlaying;
}

export function shouldShowTipLinkOpenInBrowserBanner(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""
): boolean {
  return isSocialInAppBrowser(ua);
}
