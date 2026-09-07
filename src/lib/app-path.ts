/** Current in-app path (pathname + query) for PWA install / prompt attribution. */
export function currentAppPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`.slice(0, 512);
}
