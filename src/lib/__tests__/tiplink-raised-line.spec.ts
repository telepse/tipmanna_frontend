import { describe, expect, it } from "vitest";

import { formatTipLinkRaisedLine } from "@/lib/tiplink-raised-line";

describe("formatTipLinkRaisedLine", () => {
  it("keeps the current raised line when moneyFor is empty", () => {
    expect(
      formatTipLinkRaisedLine({
        moneyFor: "",
        amountRaised: 12.5,
        amountToRaise: 100,
        tips: 3,
      })
    ).toBe("£12.50 / £100.00 raised · 3 tips");
  });

  it("prefixes towards moneyFor when set", () => {
    expect(
      formatTipLinkRaisedLine({
        moneyFor: "charity and upkeep",
        amountRaised: 12.5,
        amountToRaise: 100,
        tips: 3,
      })
    ).toBe("towards charity and upkeep £12.50 / £100.00 raised · 3 tips");
  });

  it("omits the target when amountToRaise is zero", () => {
    expect(
      formatTipLinkRaisedLine({
        moneyFor: "charity and upkeep",
        amountRaised: 12.5,
        amountToRaise: 0,
        tips: 3,
      })
    ).toBe("towards charity and upkeep £12.50 raised · 3 tips");
  });

  it("returns null when amounts are hidden", () => {
    expect(
      formatTipLinkRaisedLine({
        moneyFor: "charity and upkeep",
        amountRaised: 12.5,
        amountToRaise: 100,
        tips: 3,
        showAmounts: false,
      })
    ).toBeNull();
  });
});
