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
