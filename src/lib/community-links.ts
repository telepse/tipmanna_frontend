export function exploreCommunityJoinHref(communityId: string) {
  return `/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`;
}

export const EXPLORE_COMMUNITIES_HREF = "/explore?tab=my-communities";
