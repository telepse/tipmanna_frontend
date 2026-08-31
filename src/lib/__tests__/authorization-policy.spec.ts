import { describe, expect, it } from "vitest";

import {
  canPerformTierA,
  canPerformWrite,
  type AuthCapability,
} from "@/lib/authorization-policy";

describe("authorization-policy", () => {
  it("Tier A reads require canReadAsHost, not canWriteAsHost", () => {
    const tierA: AuthCapability = "communities.me.read";
    expect(canPerformTierA(false, tierA)).toBe(false);
    expect(canPerformTierA(true, tierA)).toBe(true);
    expect(canPerformWrite(true, false, tierA)).toBe(true);
    expect(canPerformWrite(false, true, tierA)).toBe(false);
  });

  it("Tier B writes require canWriteAsHost", () => {
    const tierB: AuthCapability = "payouts.me.write";
    expect(canPerformWrite(true, false, tierB)).toBe(false);
    expect(canPerformWrite(true, true, tierB)).toBe(true);
  });
});
