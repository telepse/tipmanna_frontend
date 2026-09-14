import { describe, expect, it } from "vitest";

import { isTipLinkEligibleChannel } from "../tiplink-channel-eligibility";

describe("isTipLinkEligibleChannel", () => {
  it("allows channels without community bank metadata", () => {
    expect(isTipLinkEligibleChannel({})).toBe(true);
    expect(isTipLinkEligibleChannel({ communityBankEntry: null })).toBe(true);
  });

  it("allows public approved community bank videos", () => {
    expect(
      isTipLinkEligibleChannel({
        communityBankEntry: { status: "approved", visibility: "public" },
      })
    ).toBe(true);
  });

  it("blocks private approved community bank videos", () => {
    expect(
      isTipLinkEligibleChannel({
        communityBankEntry: { status: "approved", visibility: "private" },
      })
    ).toBe(false);
  });
});
