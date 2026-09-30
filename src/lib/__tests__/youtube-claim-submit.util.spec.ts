import { describe, expect, it } from "vitest";
import {
  sanitizeYoutubeClaimForSubmit,
  sanitizeYoutubeClaimsForSubmit,
} from "@/lib/youtube-claim-submit.util";

describe("sanitizeYoutubeClaimForSubmit", () => {
  it("omits claim when slot selected but not verified", () => {
    expect(
      sanitizeYoutubeClaimForSubmit({
        onYoutubeChannelSlot: 1,
        isOnHostYoutube: false,
        title: "x",
      })
    ).toEqual({
      onYoutubeChannelSlot: null,
      isOnHostYoutube: false,
      title: "x",
    });
  });

  it("keeps claim when verified", () => {
    expect(
      sanitizeYoutubeClaimForSubmit({
        onYoutubeChannelSlot: 2,
        isOnHostYoutube: true,
      })
    ).toEqual({
      onYoutubeChannelSlot: 2,
      isOnHostYoutube: true,
    });
  });
});

describe("sanitizeYoutubeClaimsForSubmit", () => {
  it("maps a list", () => {
    expect(
      sanitizeYoutubeClaimsForSubmit([
        { onYoutubeChannelSlot: 1, isOnHostYoutube: false },
        { onYoutubeChannelSlot: 1, isOnHostYoutube: true },
      ])
    ).toEqual([
      { onYoutubeChannelSlot: null, isOnHostYoutube: false },
      { onYoutubeChannelSlot: 1, isOnHostYoutube: true },
    ]);
  });
});
