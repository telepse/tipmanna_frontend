import { exploreCommunityJoinHref } from "@/lib/community-links";

/** Read joinCommunity id from the live browser URL (not React searchParams). */
export function readJoinCommunityIdFromLocation(): string {
  if (typeof window === "undefined") return "";
  return (
    new URLSearchParams(window.location.search).get("joinCommunity")?.trim() ??
    ""
  );
}

/** Navigate to the community page (Explore join tab). Full page load when off Explore. */
export function navigateToCommunityPage(communityId: string): void {
  const id = communityId.trim();
  if (!id || typeof window === "undefined") return;
  const target = exploreCommunityJoinHref(id);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === target) return;
  window.location.assign(target);
}

/** When already on /explore, switch to feed tab without remounting. */
export function navigateToExploreFeedInPlace(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path !== "/explore" && !path.endsWith("/explore")) {
    window.location.assign("/explore");
    return;
  }
  const params = new URLSearchParams(window.location.search);
  params.delete("tab");
  params.delete("joinCommunity");
  if (!params.has("feedTab")) params.set("feedTab", "trends");
  const q = params.toString();
  window.location.assign(q ? `/explore?${q}` : "/explore?feedTab=trends");
}
