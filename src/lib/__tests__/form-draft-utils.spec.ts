import { describe, expect, it } from "vitest";

import { mergeDraftPayload } from "@/lib/form-draft-utils";

describe("mergeDraftPayload coOwnerDraftKey", () => {
  it("restores a saved key without minting a replacement", () => {
    const savedKey = "11111111-2222-4333-8444-555555555555";
    const merged = mergeDraftPayload(
      {
        videoLinks: [{ url: "https://youtube.com/watch?v=abc", title: "T" }],
      },
      {
        videoLinks: [{ ownershipAnswer: "no", coOwnerDraftKey: savedKey }],
      }
    );

    expect(merged.videoLinks?.[0]?.coOwnerDraftKey).toBe(savedKey);
  });

  it("does not generate a UUID when policy key is missing", () => {
    const merged = mergeDraftPayload(
      {
        videoLinks: [{ url: "https://youtube.com/watch?v=abc", title: "T" }],
      },
      {
        videoLinks: [{ ownershipAnswer: "no" }],
      }
    );

    expect(merged.videoLinks?.[0]?.coOwnerDraftKey).toBe("");
  });

  it("never replaces an existing valid key from policy with a new value", () => {
    const keyA = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const keyB = "ffffffff-1111-2222-3333-444444444444";
    const merged = mergeDraftPayload(
      {
        videoLinks: [
          {
            url: "https://youtube.com/watch?v=abc",
            title: "T",
            coOwnerDraftKey: keyB,
          },
        ],
      },
      {
        videoLinks: [{ ownershipAnswer: "no", coOwnerDraftKey: keyA }],
      }
    );

    expect(merged.videoLinks?.[0]?.coOwnerDraftKey).toBe(keyA);
  });
});
