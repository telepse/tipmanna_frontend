import { describe, expect, it } from "vitest";
import {
  computeTipRewardEligibility,
  isGalaxyIconFilled,
  isTurboIconFilled,
} from "@/lib/tip-reward-eligibility";

const chars = [
  { name: "Rose", price: 10, styleName: "rose" },
  { name: "Star", price: 10, styleName: "star" },
  { name: "Add Text", price: 5, styleName: "shock" },
];

describe("computeTipRewardEligibility", () => {
  it("counts Text style toward turbo with two other styles", () => {
    const r = computeTipRewardEligibility(
      ["Rose", "Star", "Comment"],
      chars,
      5
    );
    expect(r.distinctStyleCount).toBe(3);
    expect(r.rewardTurbo).toBe(true);
  });

  it("counts Comment cart label toward turbo styles", () => {
    const r = computeTipRewardEligibility(
      ["Rose", "Star", "Comment"],
      chars,
      5
    );
    expect(r.distinctStyleCount).toBe(3);
    expect(r.rewardTurbo).toBe(true);
  });

  it("Text alone does not unlock turbo", () => {
    const r = computeTipRewardEligibility(["Comment"], chars, 5);
    expect(r.distinctStyleCount).toBe(1);
    expect(r.rewardTurbo).toBe(false);
  });
});

describe("reward icon fill helpers", () => {
  it("fills turbo flames one per distinct style", () => {
    const r = computeTipRewardEligibility(["Rose"], chars, 5);
    expect(isTurboIconFilled(1, r)).toBe(true);
    expect(isTurboIconFilled(2, r)).toBe(false);
    expect(isTurboIconFilled(3, r)).toBe(false);
  });

  it("fills all turbo flames when turbo unlocks", () => {
    const r = computeTipRewardEligibility(
      ["Rose", "Star", "Comment"],
      chars,
      5
    );
    expect(isTurboIconFilled(1, r)).toBe(true);
    expect(isTurboIconFilled(2, r)).toBe(true);
    expect(isTurboIconFilled(3, r)).toBe(true);
  });

  it("fills galaxy sparkles per £10 toward £50", () => {
    const r = computeTipRewardEligibility(["Rose"], chars, 5);
    expect(r.totalGbp).toBe(10);
    expect(isGalaxyIconFilled(0, r)).toBe(true);
    expect(isGalaxyIconFilled(1, r)).toBe(false);
  });
});
