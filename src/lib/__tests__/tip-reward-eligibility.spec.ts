import { describe, expect, it } from "vitest";
import { computeTipRewardEligibility } from "@/lib/tip-reward-eligibility";

const chars = [
  { name: "Rose", price: 10, styleName: "rose" },
  { name: "Star", price: 10, styleName: "star" },
  { name: "Add Text", price: 5, styleName: "shock" },
];

describe("computeTipRewardEligibility", () => {
  it("counts Text style toward turbo with two other styles", () => {
    const r = computeTipRewardEligibility(["Rose", "Star", "Text"], chars, 5);
    expect(r.distinctStyleCount).toBe(3);
    expect(r.rewardTurbo).toBe(true);
  });

  it("Text alone does not unlock turbo", () => {
    const r = computeTipRewardEligibility(["Text"], chars, 5);
    expect(r.distinctStyleCount).toBe(1);
    expect(r.rewardTurbo).toBe(false);
  });
});
