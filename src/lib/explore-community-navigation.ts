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
