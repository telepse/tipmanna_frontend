/** Query flag: after host sign-up/sign-in, open Start community interest form. */
export const START_COMMUNITY_RESUME_QUERY = "startCommunity";

export function buildStartCommunityHubReturnTo(
  baseHref: string = "/explore?tab=my-communities"
): string {
  const url = new URL(baseHref, "https://tipmanna.tv");
  url.searchParams.set(START_COMMUNITY_RESUME_QUERY, "1");
  return `${url.pathname}${url.search}`;
}

export function shouldOpenStartCommunityFromSearch(
  value: string | null
): boolean {
  return value === "1" || value === "true";
}
