import { describe, expect, it } from "vitest";

import { shouldArmPostPaymentAxis } from "@/lib/tv-post-payment-axis";

describe("shouldArmPostPaymentAxis", () => {
  it("arms PPLA after successful payment when origin was GLOBAL", () => {
    expect(
      shouldArmPostPaymentAxis({
        originMode: "GLOBAL",
        paymentSucceeded: true,
      })
    ).toBe(true);
  });

  it("does not arm PPLA on GLOBAL cancel/dismiss without payment", () => {
    expect(
      shouldArmPostPaymentAxis({
        originMode: "GLOBAL",
        paymentSucceeded: false,
      })
    ).toBe(false);
  });

  it("does not arm PPLA on LOCAL cancel", () => {
    expect(
      shouldArmPostPaymentAxis({
        originMode: "LOCAL",
        paymentSucceeded: false,
      })
    ).toBe(false);
  });

  it("does not arm PPLA on LOCAL successful payment", () => {
    expect(
      shouldArmPostPaymentAxis({
        originMode: "LOCAL",
        paymentSucceeded: true,
      })
    ).toBe(false);
  });
});
