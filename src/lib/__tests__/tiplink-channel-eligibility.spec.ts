import { describe, expect, it } from "vitest";

import {
  isCommunityBankChannel,
  isTipLinkEligibleChannel,
  isTipLinkEligibleCommunityBankChannel,
  isTipLinkEligibleEventRoomChannel,
} from "../tiplink-channel-eligibility";

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

describe("event-room vs community-bank eligibility", () => {
  it("excludes all approved community bank videos from event-room path", () => {
    expect(
      isTipLinkEligibleEventRoomChannel({
        communityBankEntry: { status: "approved", visibility: "public" },
      })
    ).toBe(false);
    expect(isTipLinkEligibleEventRoomChannel({})).toBe(true);
  });

  it("allows only public approved community bank videos on community path", () => {
    expect(
      isTipLinkEligibleCommunityBankChannel({
        communityBankEntry: { status: "approved", visibility: "public" },
      })
    ).toBe(true);
    expect(
      isTipLinkEligibleCommunityBankChannel({
        communityBankEntry: { status: "approved", visibility: "private" },
      })
    ).toBe(false);
  });

  it("detects community bank channels", () => {
    expect(isCommunityBankChannel({})).toBe(false);
    expect(
      isCommunityBankChannel({
        communityBankEntry: { status: "approved", visibility: "private" },
      })
    ).toBe(true);
  });
});
