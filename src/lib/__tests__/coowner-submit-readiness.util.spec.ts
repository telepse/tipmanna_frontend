import { describe, expect, it } from "vitest";
import {
  CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL,
  CO_OWNER_SUBMIT_PREPARING_BUTTON_LABEL,
  CO_OWNER_SUBMIT_WAIT_BUTTON_LABEL,
  coOwnerAddVideoSubmitButtonLabel,
  coOwnerBlockReasonMessage,
  coOwnerSubmitHelperText,
  evaluateCoOwnerSubmitReadiness,
  isCoOwnerCheckingBlockingSubmit,
  isCoOwnerSubmitWaitOnButton,
  shouldRevalidateCoOwnerOnSubmit,
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

describe("isCoOwnerCheckingBlockingSubmit", () => {
  it("does not block submit while hidden until co-owner approves", () => {
    expect(isCoOwnerCheckingBlockingSubmit(true, true)).toBe(false);
    expect(isCoOwnerCheckingBlockingSubmit(false, true)).toBe(false);
  });

  it("blocks submit while checking before pending unlock", () => {
    expect(isCoOwnerCheckingBlockingSubmit(true, false)).toBe(true);
    expect(isCoOwnerCheckingBlockingSubmit(true)).toBe(true);
    expect(isCoOwnerCheckingBlockingSubmit(false, false)).toBe(false);
  });
});

describe("isCoOwnerSubmitWaitOnButton", () => {
  it("shows preparing while checking and not blocked", () => {
    expect(isCoOwnerSubmitWaitOnButton(false, null, true, false)).toBe(true);
    expect(isCoOwnerSubmitWaitOnButton(false, null, false, false)).toBe(false);
  });

  it("does not show wait while blocked even if checking", () => {
    expect(isCoOwnerSubmitWaitOnButton(true, null, true, false)).toBe(false);
    expect(isCoOwnerSubmitWaitOnButton(true, "has_expired", true, false)).toBe(
      false
    );
  });

  it("does not wait when hidden until co-owner approves", () => {
    expect(isCoOwnerSubmitWaitOnButton(false, null, true, true)).toBe(false);
  });
});

describe("coOwnerSubmitHelperText", () => {
  it("uses preparing copy while checking without reason", () => {
    expect(coOwnerSubmitHelperText(null, false, true)).toContain(
      "Preparing co-owner invite"
    );
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

  it("returns preparing label while checking and not blocked", () => {
    expect(coOwnerAddVideoSubmitButtonLabel(false, null, true)).toBe(
      CO_OWNER_SUBMIT_PREPARING_BUTTON_LABEL
    );
  });

  it("returns Can't submit while blocked and checking", () => {
    expect(coOwnerAddVideoSubmitButtonLabel(true, null, true)).toBe(
      CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL
    );
  });

  it("returns Can't submit when blocked without checking (e.g. missing draft key)", () => {
    expect(coOwnerAddVideoSubmitButtonLabel(true, null, false)).toBe(
      CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL
    );
    expect(
      coOwnerAddVideoSubmitButtonLabel(true, "missing_draft_key", false)
    ).toBe(CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL);
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

describe("shouldRevalidateCoOwnerOnSubmit", () => {
  it("skips duplicate status GET when pending invite already unlocked submit", () => {
    expect(
      shouldRevalidateCoOwnerOnSubmit({
        hiddenUntilCoOwnerApprove: true,
        blocked: false,
        checkingBlocksSubmit: false,
      })
    ).toBe(false);
  });

  it("revalidates when not hidden and submit is allowed", () => {
    expect(
      shouldRevalidateCoOwnerOnSubmit({
        hiddenUntilCoOwnerApprove: false,
        blocked: false,
        checkingBlocksSubmit: false,
      })
    ).toBe(true);
  });

  it("does not revalidate when blocked or checking blocks submit", () => {
    expect(
      shouldRevalidateCoOwnerOnSubmit({
        hiddenUntilCoOwnerApprove: false,
        blocked: true,
        checkingBlocksSubmit: false,
      })
    ).toBe(false);
    expect(
      shouldRevalidateCoOwnerOnSubmit({
        hiddenUntilCoOwnerApprove: false,
        blocked: false,
        checkingBlocksSubmit: true,
      })
    ).toBe(false);
  });
});
