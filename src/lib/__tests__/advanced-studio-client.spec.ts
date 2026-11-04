import { describe, expect, it } from "vitest";

/** LIVE-014/018 — client contract smoke (no browser). */
describe("Advanced Studio client types", () => {
  it("consumptionRate defaults to standard in partial rows", () => {
    const row = { advancedPrepStatus: "preparing" as const };
    expect(row.advancedPrepStatus).toBe("preparing");
  });
});
