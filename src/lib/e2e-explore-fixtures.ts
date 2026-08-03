/**
 * Deterministic Explore E2E fixtures — synthetic, non-sensitive data only.
 * Activated only when `NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES=1` at build time
 * and the URL includes `?e2e=1`.
 */

import { EXPLORE_FEED_BOOT_COUNT } from "@/lib/explore-feed-boot-constants";

export const E2E_JOIN_COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

export const E2E_SELECT_COMMUNITY_ID = "22222222-2222-4222-8222-222222222222";

const E2E_FEED_POOL_SIZE = 24;

function buildE2eFeedItem(index: number) {
  return {
    id: `e2e-channel-${index}`,
    title: `E2E Explore clip ${index}`,
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    liveStatus: "NOT_LIVE" as const,
    event: {
      id: `e2e-event-${index}`,
      eventName: `E2E Event ${index}`,
      numOfTips: 0,
      amountRaised: 0,
    },
  };
}

/** Synthetic feed pool large enough for boot + pagination continuations in E2E. */
export const E2E_FEED_ALL_ITEMS = Array.from(
  { length: E2E_FEED_POOL_SIZE },
  (_, i) => buildE2eFeedItem(i + 1)
);

export const E2E_FEED_BOOT = {
  items: E2E_FEED_ALL_ITEMS.slice(0, EXPLORE_FEED_BOOT_COUNT),
  seed: "e2e-feed-seed",
  bucketId: 1,
};

/** Next deterministic batch page for dual-gated signed-in pagination tests. */
export function takeE2eFeedBatchPage(
  alreadyLoaded: number,
  count: number
): typeof E2E_FEED_ALL_ITEMS {
  return E2E_FEED_ALL_ITEMS.slice(alreadyLoaded, alreadyLoaded + count);
}

export const E2E_DISCOVER_CONTENTS = [
  {
    id: "e2e-discover-clip",
    title: "E2E Discover clip",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    liveStatus: "NOT_LIVE",
    eventVideoType: "COMEDY",
    event: { id: "e2e-discover-event", numOfTips: 1, amountRaised: 5 },
  },
];

export const E2E_JOINED_MEMBERSHIP = {
  communityId: E2E_SELECT_COMMUNITY_ID,
  feedActive: true,
  membershipStatus: "active",
  active: true,
  revokedAt: null,
  expiresAt: null,
  community: {
    id: E2E_SELECT_COMMUNITY_ID,
    name: "E2E Community",
    logoUrl: null,
    tvActivatedAt: null,
    isSystem: false,
  },
};

/** Synthetic join-form payload for dual-gated E2E Join deep links. */
export const E2E_JOIN_FORM_PUBLIC = {
  name: "E2E Join Community",
  logoUrl: null,
  description: "Synthetic join target for E2E routing tests.",
  createdAt: null,
  totalTips: 0,
  memberCount: 1,
  numVideos: 0,
  joinMethod: "request" as const,
  customQuestion: null,
  officialEmailDomain: null,
  officialEmailDomainRequired: false,
  joinFormRequireAccessCode: false,
  defaultMonths: 1,
  subscriptionFeeGbp: null,
};

/** Deterministic TV schedule for dual-gated handoff tests (`?e2e=1&e2eTv=1`). */
export const E2E_TV_HANDOFF = {
  currentProgramme: {
    channel: {
      id: "e2e-tv-current",
      eventId: "e2e-tv-event-current",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "E2E TV Current Programme",
      liveStatus: "NOT_LIVE",
    },
    startsAt: "2020-01-01T12:00:00.000Z",
    endsAt: "2099-01-01T12:05:00.000Z",
  },
  nextProgramme: {
    channel: {
      id: "e2e-tv-next",
      eventId: "e2e-tv-event-next",
      url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
      title: "E2E TV Next Programme",
      liveStatus: "NOT_LIVE",
    },
    startsAt: "2099-01-01T12:05:00.000Z",
    endsAt: "2099-01-01T13:00:00.000Z",
  },
};
