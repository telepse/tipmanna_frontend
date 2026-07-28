import { describe, expect, it } from "vitest";
import { buildCreateDialogResumeUrl } from "@/hooks/use-create-dialog-resume";

describe("buildCreateDialogResumeUrl", () => {
  it("preserves pathname and resume params for create dialog", () => {
    const url = buildCreateDialogResumeUrl({
      pathname: "/explore",
      modalDraftId: "draft-1",
      targetId: "comm-1",
      hostTab: "owner",
      draftKind: "community_video",
    });
    const parsed = new URL(url, "https://example.com");
    expect(parsed.pathname).toBe("/explore");
    expect(parsed.searchParams.get("resumeCreateVideo")).toBe("1");
    expect(parsed.searchParams.get("modalDraftId")).toBe("draft-1");
    expect(parsed.searchParams.get("targetId")).toBe("comm-1");
    expect(parsed.searchParams.get("hostTab")).toBe("owner");
    expect(parsed.searchParams.get("draftKind")).toBe("community_video");
  });
});
