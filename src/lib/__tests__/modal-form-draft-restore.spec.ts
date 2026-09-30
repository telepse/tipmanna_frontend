import { describe, expect, it } from "vitest";
import { resolveModalDraftRestoreId } from "@/hooks/use-modal-form-draft-restore";

describe("resolveModalDraftRestoreId", () => {
  it("prefers seed over draftId and session", () => {
    expect(
      resolveModalDraftRestoreId({
        seedDraftId: "seed-1",
        draftId: "draft-2",
        sessionStoredId: "session-3",
      })
    ).toBe("seed-1");
  });

  it("falls back to draftId then session", () => {
    expect(
      resolveModalDraftRestoreId({
        seedDraftId: null,
        draftId: "draft-2",
        sessionStoredId: "session-3",
      })
    ).toBe("draft-2");
    expect(
      resolveModalDraftRestoreId({
        seedDraftId: "  ",
        draftId: null,
        sessionStoredId: "session-3",
      })
    ).toBe("session-3");
  });

  it("returns null when nothing is stored", () => {
    expect(
      resolveModalDraftRestoreId({
        seedDraftId: null,
        draftId: null,
        sessionStoredId: null,
      })
    ).toBeNull();
  });
});
