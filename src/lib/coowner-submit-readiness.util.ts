export type CoOwnerBlockReason =
  | "missing_draft_key"
  | "status_fetch_failed"
  | "missing_approved"
  | "has_pending"
  | "has_expired"
  | "has_declined"
  | "has_revoked"
  | "default_awaiting_approval"
  | "will_be_dropped";

export type CoOwnerSubmitReadiness = {
  blocked: boolean;
  reason: CoOwnerBlockReason | null;
  /** Non-blocking: video will be excluded on submit (wizard multi-video). */
  willDropOnSubmit: boolean;
  /** Submit allowed; video stays hidden from viewers until co-owner approves. */
  hiddenUntilCoOwnerApprove: boolean;
};

type InviteRow = { status: string };

/** Single source of truth for co-owner submit readiness (mirrors backend rules). */
export function evaluateCoOwnerSubmitReadiness(
  invites: InviteRow[] | null | undefined
): CoOwnerSubmitReadiness {
  if (invites == null) {
    return {
      blocked: true,
      reason: "status_fetch_failed",
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    };
  }

  if (invites.some(i => i.status === "approved")) {
    return {
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    };
  }

  if (invites.length === 0) {
    return {
      blocked: true,
      reason: "missing_approved",
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    };
  }

  if (invites.some(i => i.status === "pending")) {
    return {
      blocked: false,
      reason: "has_pending",
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: true,
    };
  }

  const onlyTerminal = invites.every(i =>
    ["expired", "declined", "revoked"].includes(i.status)
  );
  if (onlyTerminal) {
    return {
      blocked: false,
      reason: null,
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: true,
    };
  }

  if (invites.some(i => i.status === "expired")) {
    return {
      blocked: true,
      reason: "has_expired",
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    };
  }

  if (invites.some(i => i.status === "declined")) {
    return {
      blocked: true,
      reason: "has_declined",
      willDropOnSubmit: false,
      hiddenUntilCoOwnerApprove: false,
    };
  }

  return {
    blocked: true,
    reason: "missing_approved",
    willDropOnSubmit: false,
    hiddenUntilCoOwnerApprove: false,
  };
}

export function coOwnerBlockReasonMessage(reason: CoOwnerBlockReason): string {
  switch (reason) {
    case "missing_draft_key":
      return "Preparing co-owner invite. Send the invite email before you submit.";
    case "status_fetch_failed":
      return "Could not verify co-owner approval status";
    case "missing_approved":
      return "Send a co-owner email invite before you submit this video";
    case "has_pending":
      return "You can submit now. The video stays hidden from viewers until your co-owner approves the email invite.";
    case "has_expired":
      return "Co-owner invite expired — resend it before submitting";
    case "has_declined":
      return "Co-owner declined — invite a different co-owner";
    case "has_revoked":
      return "Co-owner invite was revoked — send a new invite";
    case "default_awaiting_approval":
      return "A video awaiting co-owner approval cannot be the default video";
    case "will_be_dropped":
      return "This co-owned video has no approved invite and will be excluded when you submit";
  }
}

export function coOwnerDropWarningMessage(reason: CoOwnerBlockReason): string {
  if (reason === "will_be_dropped") {
    return "No approved co-owner invite — this video will not be included in your submission unless you resend, remove the stale invite, or switch to full ownership.";
  }
  return coOwnerBlockReasonMessage(reason);
}

export const CO_OWNER_SUBMIT_WAIT_BUTTON_LABEL = "Awaiting co-owner approval";

/** Button label while co-owner status or draft key is still loading (not pending-invite). */
export const CO_OWNER_SUBMIT_PREPARING_BUTTON_LABEL = "Preparing co-owner…";

/**
 * Status `checking` must not disable submit once invite is pending
 * (hidden until co-owner approves).
 */
export function isCoOwnerCheckingBlockingSubmit(
  checking: boolean,
  hiddenUntilCoOwnerApprove?: boolean
): boolean {
  if (hiddenUntilCoOwnerApprove) return false;
  return checking;
}

/** Show wait/preparing label while status or draft key is loading (not terminal block). */
export function isCoOwnerSubmitWaitOnButton(
  blocked: boolean,
  reason: CoOwnerBlockReason | null,
  checking: boolean,
  hiddenUntilCoOwnerApprove?: boolean
): boolean {
  if (hiddenUntilCoOwnerApprove) return false;
  return checking && !blocked;
}

export function coOwnerSubmitHelperText(
  reason: CoOwnerBlockReason | null,
  hiddenUntilCoOwnerApprove?: boolean,
  checking?: boolean
): string {
  if (hiddenUntilCoOwnerApprove) {
    return coOwnerBlockReasonMessage("has_pending");
  }
  if (checking && !reason) {
    return coOwnerBlockReasonMessage("missing_draft_key");
  }
  if (reason) return coOwnerBlockReasonMessage(reason);
  return "Send a co-owner email invite before you submit this video.";
}

export const CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL = "Can't submit";

/** Add-video primary button label when co-owner gate applies (not loading / YouTube verify). */
export function coOwnerAddVideoSubmitButtonLabel(
  blocked: boolean,
  reason: CoOwnerBlockReason | null,
  checking: boolean,
  hiddenUntilCoOwnerApprove?: boolean
): string {
  if (
    isCoOwnerSubmitWaitOnButton(
      blocked,
      reason,
      checking,
      hiddenUntilCoOwnerApprove
    )
  ) {
    return blocked
      ? CO_OWNER_SUBMIT_WAIT_BUTTON_LABEL
      : CO_OWNER_SUBMIT_PREPARING_BUTTON_LABEL;
  }
  if (!blocked) {
    if (hiddenUntilCoOwnerApprove) return "Submit for approval";
    return "Save video";
  }
  return CO_OWNER_SUBMIT_BLOCKED_BUTTON_LABEL;
}

/** Show helper under submit when co-owner gate is active or status is loading. */
export function shouldShowCoOwnerSubmitHelper(
  blocked: boolean,
  checking: boolean,
  hiddenUntilCoOwnerApprove?: boolean
): boolean {
  return blocked || checking || Boolean(hiddenUntilCoOwnerApprove);
}

/** Skip duplicate status GET on submit when hook already unlocked pending-invite path. */
export function shouldRevalidateCoOwnerOnSubmit(opts: {
  hiddenUntilCoOwnerApprove: boolean;
  blocked: boolean;
  checkingBlocksSubmit: boolean;
}): boolean {
  if (opts.blocked || opts.checkingBlocksSubmit) return false;
  if (opts.hiddenUntilCoOwnerApprove) return false;
  return true;
}
