/** When `"false"`, `/watch` routes show an unavailable slate. */
export function isWatchPortalEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WATCH_PORTAL !== "false";
}

export function isWatchPortalPath(pathname: string): boolean {
  return pathname === "/watch" || pathname.startsWith("/watch/");
}

/** Venue / watch surfaces — suppress global toast, nav bar, PWA auto-prompts. */
export function isVenueChromeSuppressedPath(pathname: string): boolean {
  return (
    /\/room\/[^/]+\/overlay\/?$/.test(pathname) || isWatchPortalPath(pathname)
  );
}
