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

  it("leaves key empty when policy key is missing (mint deferred to lifecycle)", () => {
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

  it("round-trips nested coOwner policy slice", () => {
    const merged = mergeDraftPayload(
      {
        videoLinks: [{ url: "https://youtube.com/watch?v=abc", title: "T" }],
      },
      {
        videoLinks: [
          {
            ownershipAnswer: "no",
            coOwnerDraftKey: "draft-1",
            coOwner: {
              name: "Jane",
              email: "jane@example.com",
              payoutPercent: 30,
            },
          },
        ],
      }
    );

    expect(merged.videoLinks?.[0]?.coOwner).toEqual({
      name: "Jane",
      email: "jane@example.com",
      payoutPercent: 30,
    });
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
