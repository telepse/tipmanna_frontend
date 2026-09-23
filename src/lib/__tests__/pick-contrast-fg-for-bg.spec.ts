import { describe, expect, it } from "vitest";

import { pickContrastFgForHex } from "@/lib/pick-contrast-fg-for-bg";

describe("pickContrastFgForHex", () => {
  it("uses dark text on light mid-tone backgrounds", () => {
    const fg = pickContrastFgForHex("#f5f5f5");
    expect(fg.foreground).toBe("#0a0a0a");
  });

  it("uses light text on dark backgrounds", () => {
    const fg = pickContrastFgForHex("#1e293b");
    expect(fg.foreground).toBe("#fafafa");
  });

  it("accepts hex without leading hash", () => {
    const fg = pickContrastFgForHex("1e293b");
    expect(fg.foreground).toBe("#fafafa");
  });

  it("picks dark text on light gray above luminance threshold", () => {
    const fg = pickContrastFgForHex("#e8e8e8");
    expect(fg.foreground).toBe("#0a0a0a");
  });

  it("picks light text just below luminance threshold", () => {
    const fg = pickContrastFgForHex("#444444");
    expect(fg.foreground).toBe("#fafafa");
  });
});
