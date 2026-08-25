import { describe, expect, it } from "vitest";
import {
  coOwnerBlockReasonMessage,
  evaluateCoOwnerSubmitReadiness,
} from "@/lib/coowner-submit-readiness.util";

describe("evaluateCoOwnerSubmitReadiness", () => {
  it("blocks on pending before expired", () => {
    expect(
      evaluateCoOwnerSubmitReadiness([
        { status: "pending" },
        { status: "expired" },
      ])
    ).toEqual({
      blocked: true,
      reason: "has_pending",
      willDropOnSubmit: false,
    });
  });

  it("approved wins over declined sibling invites", () => {
    expect(
      evaluateCoOwnerSubmitReadiness([
        { status: "declined" },
        { status: "approved" },
      ])
    ).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
    });
  });

  it("terminal-only invites will drop on submit", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "expired" }])).toEqual({
      blocked: false,
      reason: "will_be_dropped",
      willDropOnSubmit: true,
    });
    expect(evaluateCoOwnerSubmitReadiness([{ status: "declined" }])).toEqual({
      blocked: false,
      reason: "will_be_dropped",
      willDropOnSubmit: true,
    });
  });

  it("unblocks when approved", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "approved" }])).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
    });
  });
});

describe("coOwnerBlockReasonMessage", () => {
  it("returns resend message for expired", () => {
    expect(coOwnerBlockReasonMessage("has_expired")).toContain("resend");
  });
});
