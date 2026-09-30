import { describe, expect, it } from "vitest";
import {
  applyCoOwnerRefreshResult,
  isHostPlanCapabilitiesLoading,
} from "@/lib/coowner-pending-unlock.util";

describe("applyCoOwnerRefreshResult", () => {
  it("ignores re-block while latched so stale empty status cannot lock submit", () => {
    const out = applyCoOwnerRefreshResult({
      latched: true,
      nextBlocked: true,
      nextHidden: false,
      nextReason: "missing_approved",
      nextWarnings: [],
      allTerminal: false,
    });
    expect(out.apply).toBe(false);
    expect(out.clearLatch).toBe(false);
    expect(out.blocked).toBe(false);
    expect(out.hiddenUntilCoOwnerApprove).toBe(true);
    expect(out.reason).toBe("has_pending");
  });

  it("ignores status_fetch_failed while latched", () => {
    const out = applyCoOwnerRefreshResult({
      latched: true,
      nextBlocked: true,
      nextHidden: false,
      nextReason: "status_fetch_failed",
      nextWarnings: [],
      allTerminal: false,
    });
    expect(out.apply).toBe(false);
    expect(out.clearLatch).toBe(false);
  });

  it("applies pending/hidden confirmation while latched and keeps latch", () => {
    const out = applyCoOwnerRefreshResult({
      latched: true,
      nextBlocked: false,
      nextHidden: true,
      nextReason: "has_pending",
      nextWarnings: [],
      allTerminal: false,
    });
    expect(out.apply).toBe(true);
    expect(out.clearLatch).toBe(false);
    expect(out.blocked).toBe(false);
    expect(out.hiddenUntilCoOwnerApprove).toBe(true);
  });

  it("clears latch when status is fully clear (approved path)", () => {
    const out = applyCoOwnerRefreshResult({
      latched: true,
      nextBlocked: false,
      nextHidden: false,
      nextReason: null,
      nextWarnings: [],
      allTerminal: true,
    });
    expect(out.apply).toBe(true);
    expect(out.clearLatch).toBe(true);
    expect(out.blocked).toBe(false);
    expect(out.hiddenUntilCoOwnerApprove).toBe(false);
  });

  it("applies normal block when not latched", () => {
    const out = applyCoOwnerRefreshResult({
      latched: false,
      nextBlocked: true,
      nextHidden: false,
      nextReason: "missing_approved",
      nextWarnings: [],
      allTerminal: false,
    });
    expect(out.apply).toBe(true);
    expect(out.blocked).toBe(true);
    expect(out.clearLatch).toBe(false);
  });
});

describe("isHostPlanCapabilitiesLoading", () => {
  it("is true while host session is loading even if SWR is idle", () => {
    expect(isHostPlanCapabilitiesLoading(true, false)).toBe(true);
  });

  it("is true while SWR is loading", () => {
    expect(isHostPlanCapabilitiesLoading(false, true)).toBe(true);
  });

  it("is false when session and SWR are settled", () => {
    expect(isHostPlanCapabilitiesLoading(false, false)).toBe(false);
  });
});
