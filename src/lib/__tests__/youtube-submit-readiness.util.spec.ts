import { describe, expect, it } from "vitest";
import {
  isYoutubeVerifyBlockingSubmit,
  youtubeVerifyBlockingMessage,
} from "@/lib/youtube-submit-readiness.util";

describe("isYoutubeVerifyBlockingSubmit", () => {
  it("blocks only while verification is checking for slot 1 or 2", () => {
    expect(
      isYoutubeVerifyBlockingSubmit(
        [
          {
            ownershipAnswer: "yes",
            onYoutubeChannelSlot: 1,
            isOnHostYoutube: false,
          } as never,
        ],
        { 0: "idle" }
      )
    ).toBe(false);

    expect(
      isYoutubeVerifyBlockingSubmit(
        [
          {
            ownershipAnswer: "yes",
            onYoutubeChannelSlot: 1,
            isOnHostYoutube: false,
          } as never,
        ],
        { 0: "checking" }
      )
    ).toBe(true);
  });

  it("does not block checking when no channel slot is selected", () => {
    expect(
      isYoutubeVerifyBlockingSubmit(
        [
          {
            ownershipAnswer: "no",
            onYoutubeChannelSlot: null,
            isOnHostYoutube: false,
          } as never,
        ],
        { 0: "checking" }
      )
    ).toBe(false);
  });
});

describe("youtubeVerifyBlockingMessage", () => {
  it("returns message only during checking with a slot", () => {
    expect(
      youtubeVerifyBlockingMessage(
        [{ ownershipAnswer: "yes", onYoutubeChannelSlot: 2 } as never],
        { 0: "failed" }
      )
    ).toBeNull();

    expect(
      youtubeVerifyBlockingMessage(
        [{ ownershipAnswer: "yes", onYoutubeChannelSlot: 2 } as never],
        { 0: "checking" }
      )
    ).toBe("Verifying on YouTube…");
  });
});
