import type { CoOwnerBlockReason } from "@/lib/coowner-submit-readiness.util";

export type CoOwnerRefreshApplyInput = {
  latched: boolean;
  nextBlocked: boolean;
  nextHidden: boolean;
  nextReason: CoOwnerBlockReason | null;
  nextWarnings: string[];
  allTerminal: boolean;
};

export type CoOwnerRefreshApplyOutput = {
  /** When false, keep current optimistic unlock state; only clear checking flags. */
  apply: boolean;
  blocked: boolean;
  hiddenUntilCoOwnerApprove: boolean;
  reason: CoOwnerBlockReason | null;
  warnings: string[];
  allTerminal: boolean;
  /** Clear pending-unlock latch when status confirms unlocked without needing latch. */
  clearLatch: boolean;
};

/**
 * While invite-success latch is set, never re-block from empty/failed status
 * (stale or slow polls). Confirming pending/hidden or fully clear applies normally.
 */
export function applyCoOwnerRefreshResult(
  input: CoOwnerRefreshApplyInput
): CoOwnerRefreshApplyOutput {
  const {
    latched,
    nextBlocked,
    nextHidden,
    nextReason,
    nextWarnings,
    allTerminal,
  } = input;

  if (latched && nextBlocked && !nextHidden) {
    return {
      apply: false,
      blocked: false,
      hiddenUntilCoOwnerApprove: true,
      reason: "has_pending",
      warnings: nextWarnings,
      allTerminal: false,
      clearLatch: false,
    };
  }

  return {
    apply: true,
    blocked: nextBlocked,
    hiddenUntilCoOwnerApprove: nextHidden,
    reason: nextReason,
    warnings: nextWarnings,
    allTerminal: allTerminal && !nextBlocked && !nextHidden,
    // Keep latch while still hidden-until-approve; clear when approved/clear path.
    clearLatch: latched ? !nextHidden && !nextBlocked : false,
  };
}

/** Combined plan loading: wait for host session before treating premium as false. */
export function isHostPlanCapabilitiesLoading(
  hostSessionLoading: boolean,
  swrIsLoading: boolean
): boolean {
  return hostSessionLoading || swrIsLoading;
}
