import { describe, expect, it } from "vitest";

import {
  coOwnerBlockReasonMessage,
  evaluateCoOwnerSubmitReadiness,
} from "@/lib/coowner-submit-readiness.util";

describe("evaluateCoOwnerSubmitReadiness", () => {
  it("blocks when invites are null", () => {
    expect(evaluateCoOwnerSubmitReadiness(null)).toEqual({
      blocked: true,
      reason: "status_fetch_failed",
    });
  });

  it("blocks when any invite is pending", () => {
    expect(
      evaluateCoOwnerSubmitReadiness([
        { status: "approved" },
        { status: "pending" },
      ])
    ).toEqual({
      blocked: true,
      reason: "has_pending",
    });
  });

  it("blocks when no approved invite exists", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "pending" }])).toEqual({
      blocked: true,
      reason: "has_pending",
    });
    expect(evaluateCoOwnerSubmitReadiness([{ status: "declined" }])).toEqual({
      blocked: true,
      reason: "missing_approved",
    });
  });

  it("unblocks when approved and no pending invites", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "approved" }])).toEqual({
      blocked: false,
      reason: null,
    });
  });
});

describe("coOwnerBlockReasonMessage", () => {
  it("maps all reasons to user-facing copy", () => {
    expect(coOwnerBlockReasonMessage("has_pending")).toContain("approved");
    expect(coOwnerBlockReasonMessage("missing_draft_key")).toContain("draft");
  });
});
