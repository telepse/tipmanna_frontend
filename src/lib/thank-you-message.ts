import { buildCreatorProfileShareUrl } from "@/lib/creator-profile-url";

const PLACEHOLDER_AMOUNT = "{amount}";
const PLACEHOLDER_CHARACTER = "{character}";
const PLACEHOLDER_TIPPED_AT = "{tippedAt}";
const PLACEHOLDER_HOST_FIRST_NAME = "{hostFirstName}";
const PLACEHOLDER_CREATOR_PAGE_URL = "{creatorPageUrl}";
const PLACEHOLDER_COMMUNITY_NAME = "{communityName}";
const PLACEHOLDER_COMMUNITY_PAGE_URL = "{communityPageUrl}";

export type ThankYouTemplateContext = {
  hostFirstName?: string;
  creatorPageUrl?: string;
  communityName?: string;
  communityPageUrl?: string;
};

export function buildDefaultThankYouTemplate(
  ctx: ThankYouTemplateContext
): string {
  const useCommunity = Boolean(ctx.communityName?.trim());
  if (useCommunity) {
    return `Thank you for your engagement and support from ${PLACEHOLDER_COMMUNITY_NAME} ${PLACEHOLDER_COMMUNITY_PAGE_URL} ${PLACEHOLDER_AMOUNT} ${PLACEHOLDER_CHARACTER} ${PLACEHOLDER_TIPPED_AT}`;
  }
  const first = ctx.hostFirstName?.trim() || PLACEHOLDER_HOST_FIRST_NAME;
  const url = ctx.creatorPageUrl?.trim() || PLACEHOLDER_CREATOR_PAGE_URL;
  return `Thank you for your engagement and support from ${first} ${url} ${PLACEHOLDER_AMOUNT} ${PLACEHOLDER_CHARACTER} ${PLACEHOLDER_TIPPED_AT}`;
}

export function buildDefaultThankYouForHost(params: {
  fullName?: string | null;
  username?: string | null;
}): string {
  const hostFirstName = params.fullName?.trim().split(/\s+/)[0];
  const creatorPageUrl = params.username
    ? buildCreatorProfileShareUrl(params.username)
    : undefined;
  return buildDefaultThankYouTemplate({ hostFirstName, creatorPageUrl });
}
