import { describe, expect, it, vi } from "vitest";

import { shouldRequestTipQuoteForWalletDebit } from "@/lib/wallet-tip-quote";

describe("shouldRequestTipQuoteForWalletDebit", () => {
  const ensure = vi.fn(async () => "quote-1");

  it("requests quote for tip mode when helper is provided (any surface)", () => {
    expect(shouldRequestTipQuoteForWalletDebit(ensure, "tip")).toBe(true);
  });

  it("does not request quote without helper (legacy)", () => {
    expect(shouldRequestTipQuoteForWalletDebit(undefined, "tip")).toBe(false);
  });

  it("does not request quote for non-tip wallet modes", () => {
    expect(shouldRequestTipQuoteForWalletDebit(ensure, "topup")).toBe(false);
  });
});
