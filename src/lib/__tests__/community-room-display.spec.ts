import { describe, expect, it } from "vitest";
import {
  communityDisplayChannel,
  mapCommunityRoomScreenSettings,
  parseDisplayUpdatedPayload,
} from "@/lib/community-room-display";

describe("community room display contract", () => {
  it("builds pusher channel name", () => {
    expect(communityDisplayChannel("abc")).toBe("community-abc");
  });

  it("parses valid display-updated payload", () => {
    expect(parseDisplayUpdatedPayload({ communityId: "c1", at: 123 })).toEqual({
      communityId: "c1",
      at: 123,
    });
  });

  it("rejects malformed display-updated payload", () => {
    expect(parseDisplayUpdatedPayload({ communityId: "c1" })).toBeNull();
    expect(parseDisplayUpdatedPayload(null)).toBeNull();
  });

  it("maps GET screen-settings data", () => {
    expect(
      mapCommunityRoomScreenSettings({
        data: {
          background: "https://x/y.png",
          moneyFor: "Goal",
          showLatest: true,
          hideProgressAmount: false,
        },
      })
    ).toMatchObject({
      background: "https://x/y.png",
      moneyFor: "Goal",
      showLatest: true,
      hideProgressAmount: false,
    });
  });
});
