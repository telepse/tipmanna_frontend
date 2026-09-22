import { describe, expect, it } from "vitest";
import { resolveStartCommunityAfterGuestModal } from "../start-community-guest-resume";

describe("resolveStartCommunityAfterGuestModal", () => {
  it("HOST opens the interest form directly", () => {
    expect(resolveStartCommunityAfterGuestModal("HOST")).toBe("openForm");
  });

  it("TIPPER continues host auth / upgrade", () => {
    expect(resolveStartCommunityAfterGuestModal("TIPPER")).toBe(
      "resumeHostAuth"
    );
  });
});
