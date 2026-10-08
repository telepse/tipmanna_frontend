/** Escape / Back target for watch shell (10-foot navigation). */

export function resolveWatchEscapeHref(pathname: string): string | null {
  if (pathname === "/watch/screen") {
    return "/watch";
  }
  if (/^\/watch\/screen\/[^/]+\/?$/.test(pathname)) {
    return "/watch/screen";
  }
  if (pathname === "/watch/tv" || pathname === "/watch/explore") {
    return "/watch";
  }
  if (pathname.startsWith("/watch/") && pathname !== "/watch") {
    return "/watch";
  }
  return null;
}
