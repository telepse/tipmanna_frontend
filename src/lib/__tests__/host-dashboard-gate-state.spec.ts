import { describe, expect, it } from "vitest";

import {
  shouldInitDashboardReady,
  shouldKeepDashboardContentDuringProbe,
} from "@/lib/host-dashboard-gate-state";

describe("host dashboard gate state", () => {
  it("keeps content during probe when write grant or TTL grant", () => {
    expect(
      shouldKeepDashboardContentDuringProbe({
        hadWriteGrant: true,
        grantValid: false,
        probeLoading: true,
      })
    ).toBe(true);

    expect(
      shouldKeepDashboardContentDuringProbe({
        hadWriteGrant: false,
        grantValid: true,
        probeLoading: true,
      })
    ).toBe(true);
  });

  it("init ready only from verify grant not cookie alone", () => {
    expect(shouldInitDashboardReady(true)).toBe(true);
    expect(shouldInitDashboardReady(false)).toBe(false);
  });

  it("does not keep content on cookie-only first verify", () => {
    expect(
      shouldKeepDashboardContentDuringProbe({
        hadWriteGrant: false,
        grantValid: false,
        probeLoading: true,
      })
    ).toBe(false);
  });
});
