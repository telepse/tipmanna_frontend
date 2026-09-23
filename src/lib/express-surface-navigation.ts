import { navigateToTvSource } from "@/lib/tv-source-navigation";

/** Express bar: leave heavy client trees immediately for /tv. */
export function expressNavigateToTv(communityId?: string | null): void {
  if (typeof window === "undefined") return;
  const cid = communityId?.trim() || null;
  const target = cid ? `/tv?community=${encodeURIComponent(cid)}` : "/tv";
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === target) return;
  navigateToTvSource(cid);
}

/** Express bar: leave heavy client trees immediately for /explore feed. */
export function expressNavigateToExplore(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/explore" || path.endsWith("/explore")) {
    // In-shell Feed/Hub tabs own Explore navigation — never remount the shell.
    return;
  }
  window.location.assign("/explore?feedTab=trends");
}

/** Express bar: leave heavy client trees immediately for /explore feed. */
export function expressNavigateToDiscover(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/explore" || path.endsWith("/explore")) {
    // In-shell Feed/Hub tabs own Explore navigation — never remount the shell.
    return;
  }
  window.location.assign("/explore?feedTab=trends&tab=discover");
}

/** Express bar: leave heavy client trees immediately for /explore feed. */
export function expressNavigateToCommunity(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/explore" || path.endsWith("/explore")) {
    // In-shell Feed/Hub tabs own Explore navigation — never remount the shell.
    return;
  }
  window.location.assign("/explore?feedTab=trends&tab=my-communities");
}
