import { describe, expect, it } from "vitest";

/** Mirrors creator-page fallthrough guard for create-tiplink-draft. */
function profileSubscriptionResumeKind(
  kind: string,
  resumeChannelId: string | null
): string | null {
  if (kind === "create-tiplink-draft") {
    if (!resumeChannelId) return null;
    return null;
  }
  if (kind === "change-photo" || kind === "external-link") {
    return kind;
  }
  return kind;
}

describe("create-tiplink-draft subscription resume", () => {
  it("never maps create-tiplink-draft to edit-profile resume", () => {
    expect(
      profileSubscriptionResumeKind("create-tiplink-draft", "ch-1")
    ).toBeNull();
  });

  it("still maps change-photo to edit-profile resume", () => {
    expect(profileSubscriptionResumeKind("change-photo", null)).toBe(
      "change-photo"
    );
  });
});
