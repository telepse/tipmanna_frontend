import { describe, expect, it } from "vitest";
import { hudProgressAmountLabelsVisible } from "@/lib/screen-display-hud-progress";

describe("screen-display-hud progress amount truth table", () => {
  it("ON: hideProgressBarAmount false shows labels when raised amount enabled", () => {
    expect(hudProgressAmountLabelsVisible(false, true)).toBe(true);
    expect(hudProgressAmountLabelsVisible(undefined, true)).toBe(true);
  });

  it("OFF: hideProgressBarAmount true hides labels", () => {
    expect(hudProgressAmountLabelsVisible(true, true)).toBe(false);
  });

  it("respects showRaisedAmount gate", () => {
    expect(hudProgressAmountLabelsVisible(false, false)).toBe(false);
  });
});
