/**
 * Canonical narrow / “smartapp” breakpoint — keep in sync with
 * `.smartapp-mobile-shell` in globals.css (500px).
 */
export const SURFACE_MOBILE_MAX_PX = 500 as const;

export const SURFACE_MOBILE_MAX_MEDIA = `(max-width: ${SURFACE_MOBILE_MAX_PX}px)`;
