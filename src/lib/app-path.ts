/** Current in-app path (pathname + query) for PWA install / prompt attribution. */
export function currentAppPath(): string {
  if (typeof window === "undefined") return "/";
  const pathname = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const kept: string[] = [];
  params.forEach((value, key) => {
    if (key.toLowerCase().startsWith("utm_")) return;
    kept.push(`${key}=${value}`);
  });
  const search = kept.length ? `?${kept.join("&")}` : "";
  return `${pathname}${search}`.slice(0, 512);
}
