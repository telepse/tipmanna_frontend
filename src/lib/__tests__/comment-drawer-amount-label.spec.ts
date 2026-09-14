import { describe, expect, it } from "vitest";

function formatCommentDrawerAmountLabel(
  amountRaised: number | null | undefined,
  amountToRaise: number | null | undefined
): string | null {
  if (typeof amountRaised !== "number" || !Number.isFinite(amountRaised)) {
    return null;
  }
  const formatGbp = (value: number) =>
    value.toLocaleString(undefined, {
      style: "currency",
      currency: "GBP",
    });
  const target =
    typeof amountToRaise === "number" && amountToRaise > 0
      ? amountToRaise
      : null;
  if (target != null) {
    return `${formatGbp(amountRaised)} / ${formatGbp(target)} raised`;
  }
  return `${formatGbp(amountRaised)} raised`;
}

describe("comment drawer amount label", () => {
  it("shows raised/target fraction when target is set", () => {
    const label = formatCommentDrawerAmountLabel(250, 1000);
    expect(label).toContain("250");
    expect(label).toContain("1,000");
    expect(label).toContain("raised");
  });

  it("returns null when amount is hidden", () => {
    expect(formatCommentDrawerAmountLabel(null, 1000)).toBeNull();
  });
});
