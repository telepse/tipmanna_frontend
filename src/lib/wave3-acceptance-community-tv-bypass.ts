import {
  E2E_FEATURED_OVERLAY_CHANNEL_ID,
  E2E_FEATURED_OVERLAY_EVENT_ID,
  E2E_FIXTURE_MEDIA_URL,
} from "@/lib/e2e-explore-fixtures";
import { isExploreE2eFixturesEnvEnabled } from "@/lib/explore-e2e-fixtures-gate";
import { WAVE3_ACCEPTANCE_COMMUNITY_TV_ID } from "@/lib/wave3-acceptance-fixture-ids";

/**
 * Preview-only: allow Wave 3 acceptance community TV without mutating staging membership.
 * Gated by compile-time E2E fixtures flag and the fixed acceptance community UUID.
 */
export function isWave3AcceptanceCommunityTvE2eBypass(
  communityId: string | null | undefined
): boolean {
  const id = communityId?.trim();
  if (!id || id !== WAVE3_ACCEPTANCE_COMMUNITY_TV_ID) return false;
  return isExploreE2eFixturesEnvEnabled();
}

/** Isolated schedule row for acceptance community TV when protected schedule API returns 401. */
export function buildWave3AcceptanceCommunityTvSchedulePayload() {
  const now = Date.now();
  return {
    serverNow: now,
    broadcastEpoch: now,
    totalDuration: 300,
    scheduleState: "ONGOING",
    activeScheduleId: "wave3-acceptance-community-tv",
    items: [
      {
        id: "wave3-acc-schedule-item-1",
        channel: {
          id: E2E_FEATURED_OVERLAY_CHANNEL_ID,
          eventId: E2E_FEATURED_OVERLAY_EVENT_ID,
          url: E2E_FIXTURE_MEDIA_URL,
          title: "Wave 3 acceptance community TV",
          liveStatus: "NOT_LIVE",
          community: { id: WAVE3_ACCEPTANCE_COMMUNITY_TV_ID },
        },
        startsAt: "2020-01-01T00:00:00.000Z",
        endsAt: "2099-01-01T00:05:00.000Z",
      },
    ],
    livePosition: {
      scheduleIndex: 0,
      offsetSeconds: 0,
      loopPosition: 0,
      totalDuration: 300,
    },
  };
}
