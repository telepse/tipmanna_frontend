/**
 * Canonical narrow / “smartapp” breakpoint — keep in sync with
 * `.smartapp-mobile-shell` in globals.css (500px).
 */
export const SURFACE_MOBILE_MAX_PX = 500 as const;

/** Tablet / narrow desktop shell — stack wide TV grid below this width. */
export const SURFACE_TABLET_MAX_PX = 1024 as const;

export const SURFACE_MOBILE_MAX_MEDIA = `(max-width: ${SURFACE_MOBILE_MAX_PX}px)`;

export const SURFACE_TABLET_MAX_MEDIA = `(max-width: ${SURFACE_TABLET_MAX_PX}px)`;

/**
 * Phone rotated to landscape — short viewport height (width becomes ~800px+).
 * Matches resolveTvSurfaceMode phoneLandscape rule.
 */
export const SURFACE_PHONE_LANDSCAPE_MEDIA = `(orientation: landscape) and (max-height: ${SURFACE_MOBILE_MAX_PX}px)`;

/** @deprecated Use SURFACE_PHONE_LANDSCAPE_MEDIA — width-based landscape was incorrect for modern phones. */
export const SURFACE_MOBILE_LANDSCAPE_MEDIA = SURFACE_PHONE_LANDSCAPE_MEDIA;
