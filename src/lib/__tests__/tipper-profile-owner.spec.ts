import { describe, expect, it } from "vitest";

import { isProfileOwner } from "@/lib/tipper-profile-owner";

describe("isProfileOwner", () => {
  const tipperProfile = {
    profileId: "t1",
    kind: "tipper" as const,
  };

  it("matches tipper session by id not slug", () => {
    expect(
      isProfileOwner(
        {
          id: "t1",
          username: "old-email-prefix",
          role: "TIPPER",
        },
        tipperProfile
      )
    ).toBe(true);
  });

  it("rejects slug-only match after migration", () => {
    expect(
      isProfileOwner(
        {
          id: "t1",
          username: "old-email-prefix",
          role: "TIPPER",
        },
        { ...tipperProfile, profileId: "other" }
      )
    ).toBe(false);
  });

  it("matches visitor session by id", () => {
    expect(
      isProfileOwner(
        { id: "v1", username: "tipperguest42", role: "VISITOR" },
        { profileId: "v1", kind: "visitor" }
      )
    ).toBe(true);
  });
});
