import { describe, expect, it } from "vitest";
import {
  CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL,
  CO_OWNER_SUBMIT_WAIT_BUTTON_LABEL,
  coOwnerAddVideoSubmitButtonLabel,
  coOwnerBlockReasonMessage,
  evaluateCoOwnerSubmitReadiness,
  isCoOwnerSubmitWaitOnButton,
  shouldShowCoOwnerSubmitHelper,
} from "@/lib/coowner-submit-readiness.util";

describe("evaluateCoOwnerSubmitReadiness", () => {
  it("allows submit while pending (hidden until approve)", () => {
    expect(
      evaluateCoOwnerSubmitReadiness([
        { status: "pending" },
        { status: "expired" },
      ])
    ).toEqual({
      blocked: false,
      reason: "has_pending",
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: true,
    });
  });

  it("approved wins over pending sibling invites", () => {
    expect(
      evaluateCoOwnerSubmitReadiness([
        { status: "pending" },
        { status: "approved" },
      ])
    ).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
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
      hiddenUntilCoOwnerApprove: false,
    });
  });

  it("terminal-only invites can submit (waiting on server)", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "expired" }])).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: true,
    });
    expect(evaluateCoOwnerSubmitReadiness([{ status: "declined" }])).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: true,
    });
  });

  it("unblocks when approved", () => {
    expect(evaluateCoOwnerSubmitReadiness([{ status: "approved" }])).toEqual({
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    });
  });
});

describe("coOwnerBlockReasonMessage", () => {
  it("returns resend message for expired", () => {
    expect(coOwnerBlockReasonMessage("has_expired")).toContain("resend");
  });
});

describe("isCoOwnerSubmitWaitOnButton", () => {
  it("shows wait label only while checking without a block reason", () => {
    expect(isCoOwnerSubmitWaitOnButton(true, "has_pending", false)).toBe(false);
    expect(isCoOwnerSubmitWaitOnButton(true, null, true)).toBe(true);
  });

  it("does not use wait label for terminal block reasons", () => {
    expect(isCoOwnerSubmitWaitOnButton(true, "has_expired", false)).toBe(false);
  });
});

describe("coOwnerAddVideoSubmitButtonLabel", () => {
  it("returns Save video when not blocked", () => {
    expect(coOwnerAddVideoSubmitButtonLabel(false, null, false)).toBe(
      "Save video"
    );
  });

  it("returns submit-for-approval when hidden until co-owner approves", () => {
    expect(
      coOwnerAddVideoSubmitButtonLabel(false, "has_pending", false, true)
    ).toBe("Submit for approval");
  });

  it("returns wait label only while checking", () => {
    expect(coOwnerAddVideoSubmitButtonLabel(true, null, true)).toBe(
      CO_OWNER_SUBMIT_WAIT_BUTTON_LABEL
    );
  });

  it("returns Can't submit for terminal block reasons", () => {
    expect(coOwnerAddVideoSubmitButtonLabel(true, "has_expired", false)).toBe(
      CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL
    );
    expect(
      coOwnerAddVideoSubmitButtonLabel(true, "will_be_dropped", false)
    ).toBe(CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL);
  });
});

describe("shouldShowCoOwnerSubmitHelper", () => {
  it("shows helper when blocked, checking, or hidden until approve", () => {
    expect(shouldShowCoOwnerSubmitHelper(true, false)).toBe(true);
    expect(shouldShowCoOwnerSubmitHelper(false, true)).toBe(true);
    expect(shouldShowCoOwnerSubmitHelper(false, false, true)).toBe(true);
    expect(shouldShowCoOwnerSubmitHelper(false, false)).toBe(false);
  });
});
