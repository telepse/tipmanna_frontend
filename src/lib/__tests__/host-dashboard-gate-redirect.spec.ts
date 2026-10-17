import { describe, expect, it } from "vitest";

import { resolveHostDashboardRedirect } from "@/lib/host-dashboard-gate-redirect";

describe("resolveHostDashboardRedirect", () => {
  it("waits while host link or session probes are loading", () => {
    expect(
      resolveHostDashboardRedirect({
        canReadAsHost: false,
        canWriteAsHost: false,
        capabilityStatus: "loading",
        probeLoading: true,
        hostSessionLoading: false,
      })
    ).toBe("wait");
  });

  it("opens host auth for stale linked host instead of tipper fallback", () => {
    expect(
      resolveHostDashboardRedirect({
        canReadAsHost: false,
        canWriteAsHost: false,
        capabilityStatus: "stale",
        probeLoading: false,
        hostSessionLoading: false,
      })
    ).toBe("host_auth");
  });

  it("uses tipper fallback only when user has no host link", () => {
    expect(
      resolveHostDashboardRedirect({
        canReadAsHost: false,
        canWriteAsHost: false,
        capabilityStatus: "none",
        probeLoading: false,
        hostSessionLoading: false,
      })
    ).toBe("tipper_fallback");
  });
});
