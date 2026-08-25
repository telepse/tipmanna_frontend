import { describe, expect, it } from "vitest";

import {
  computeTipCartTotal,
  stripeElementsAmountMinor,
  toMinorUnits,
} from "../tip-cart-total";

describe("computeTipCartTotal", () => {
  const catalog = [
    { name: "Burger", price: 3 },
    { name: "Chicken", price: 7 },
  ];

  it("sums character prices", () => {
    expect(computeTipCartTotal(["Burger", "Chicken"], catalog)).toBe(10);
  });

  it("uses host text tip unit price for Comment", () => {
    expect(computeTipCartTotal(["Comment"], catalog, 8)).toBe(8);
    expect(computeTipCartTotal(["Comment"], catalog, 0)).toBe(5);
  });

  it("returns 0 for empty selection", () => {
    expect(computeTipCartTotal([], catalog)).toBe(0);
  });
});

describe("stripeElementsAmountMinor", () => {
  it("uses exact cart total in pence when non-empty", () => {
    expect(stripeElementsAmountMinor(5)).toBe(500);
    expect(stripeElementsAmountMinor(12.34)).toBe(1234);
  });

  it("uses placeholder when cart is empty", () => {
    expect(stripeElementsAmountMinor(0)).toBe(100);
  });
});

describe("toMinorUnits", () => {
  it("rounds GBP to pence", () => {
    expect(toMinorUnits(1.995)).toBe(200);
  });
});
