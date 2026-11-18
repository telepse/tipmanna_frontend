/**
 * TipLink payment-return integrity helpers (Stripe → /success → /l/[slug]).
 */

/** YouTube IFrame API: missing Referer / client identity (July 2025). */
export const YOUTUBE_ERROR_EMBED_IDENTITY = 153;

export function isYoutubeEmbedIdentityError(code: unknown): boolean {
  return code === YOUTUBE_ERROR_EMBED_IDENTITY;
}

/** TipLink public + preview paths that should hard-navigate after Stripe. */
export function isTipLinkPaymentReturnPath(pathname: string): boolean {
  const path = pathname.trim();
  return path === "/l" || path.startsWith("/l/");
}

/**
 * After Stripe, TipLink uses a full document navigation so WebViews pick up
 * fresh HTML/JS chunks (avoids "Failed to load chunk" on soft client transition).
 * Explore/TV keep soft router.replace + watchdog.
 */
export function shouldHardNavigatePaymentReturn(pathname: string): boolean {
  return isTipLinkPaymentReturnPath(pathname);
}

export function shouldForceTipLinkOpenInBrowserForPlayerError(
  errorCode: unknown
): boolean {
  return isYoutubeEmbedIdentityError(errorCode);
}
