import { describe, expect, it } from "vitest";

import {
  mergeDraftPayload,
  splitModalDraftPayload,
  buildModalVerifyStatusPolicy,
  modalVerifyStateFromPolicy,
} from "@/lib/form-draft-utils";
import { DEFAULT_THANK_YOU_PREFIX } from "@/lib/thank-you-message";

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

describe("modal YouTube verify draft policy", () => {
  it("persists verify state keyed by slot and url", () => {
    const { policyJson } = splitModalDraftPayload(
      {
        title: "T",
        description: "",
        url: "https://youtube.com/watch?v=abc",
        isLive: false,
        setReminder: false,
        reminders: {},
        contentLanguage: "en-GB",
        contentCountry: "all",
        eventVideoType: "__inherit__",
        hostYoutubeSlot: "1",
        ownershipAnswer: "yes",
        coOwnerDraftKey: "",
      },
      "verified"
    );

    expect(policyJson.verifyStatus).toEqual({
      "1:https://youtube.com/watch?v=abc": "verified",
    });
  });

  it("restores verify state when url and slot match", () => {
    const policy = {
      verifyStatus: {
        "2:https://youtube.com/watch?v=xyz": "failed",
      },
    };
    expect(
      modalVerifyStateFromPolicy(policy, "https://youtube.com/watch?v=xyz", "2")
    ).toBe("failed");
    expect(
      modalVerifyStateFromPolicy(
        policy,
        "https://youtube.com/watch?v=other",
        "2"
      )
    ).toBe("idle");
  });

  it("does not persist verify state without host slot", () => {
    expect(
      buildModalVerifyStatusPolicy(
        "https://youtube.com/watch?v=abc",
        "none",
        "verified"
      )
    ).toBeUndefined();
  });
});

describe("mergeDraftPayload thankYouMessage", () => {
  it("restores legacy full default template as prefix only", () => {
    const legacy =
      "Thank you for your engagement and support from Emediong http://localhost:3000/@tipper {amount} {character} {tippedAt}";
    const merged = mergeDraftPayload({ thankYouMessage: legacy }, {});
    expect(merged.thankYouMessage).toBe(DEFAULT_THANK_YOU_PREFIX);
  });

  it("leaves prefix-only draft unchanged", () => {
    const merged = mergeDraftPayload(
      { thankYouMessage: DEFAULT_THANK_YOU_PREFIX },
      {}
    );
    expect(merged.thankYouMessage).toBe(DEFAULT_THANK_YOU_PREFIX);
  });
});
