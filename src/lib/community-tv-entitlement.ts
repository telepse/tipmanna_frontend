import { isCommunityAlreadyIn } from "@/lib/community-already-in";

/** Subset of GET /communities/:id/access-state used for Community TV entitlement. */
export type CommunityTvAccessStateSlice = {
  isMember?: boolean;
  viewerHostsCommunity?: boolean;
  /** Same rule as backend community-tv-viewer-access.util (owner/co-creator/member). */
  communityTvViewerEntitled?: boolean;
};

/**
 * Fail-closed Community TV entitlement from access-state.
 * Prefers `communityTvViewerEntitled` when present (aligns with Stage A/B API).
 */
export function isCommunityTvEntitledFromAccessState(
  data: CommunityTvAccessStateSlice | null | undefined
): boolean {
  if (!data) return false;
  if (typeof data.communityTvViewerEntitled === "boolean") {
    return data.communityTvViewerEntitled;
  }
  return isCommunityAlreadyIn({
    isMember: Boolean(data.isMember),
    viewerHostsCommunity: Boolean(data.viewerHostsCommunity),
  });
}
