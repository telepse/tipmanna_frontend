/** Query keys consumed by host-community dashboard vs creator Community tab. */
export const ADD_COMMUNITY_VIDEO_DASHBOARD_QUERY = "addVideo";
export const ADD_COMMUNITY_VIDEO_CREATOR_QUERY = "addCommunityVideo";
export const ADD_COMMUNITY_VIDEO_CREATOR_ID_QUERY = "addCommunityVideoId";

function isHostCommunityDashboardPath(pathname: string): boolean {
  const path = pathname.trim();
  if (!path) return false;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return /\/host\/[^/]+\/host-community\/?$/.test(normalized);
}

/**
 * Return path for subscribe resume after add-community-video subscription errors.
 * Dashboard: communityId + addVideo=1. Creator profile: addCommunityVideo + id.
 */
export function buildAddCommunityVideoSubscriptionResumePath(
  pathname: string,
  communityId: string
): string {
  const id = communityId.trim();
  const basePath = pathname.trim() || "/host";
  const url = new URL(basePath, "https://tipmanna.tv");

  if (isHostCommunityDashboardPath(url.pathname)) {
    url.searchParams.set("communityId", id);
    url.searchParams.set(ADD_COMMUNITY_VIDEO_DASHBOARD_QUERY, "1");
  } else {
    url.searchParams.set(ADD_COMMUNITY_VIDEO_CREATOR_QUERY, "1");
    url.searchParams.set(ADD_COMMUNITY_VIDEO_CREATOR_ID_QUERY, id);
  }

  return `${url.pathname}${url.search}`;
}
