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
    };
  }

  if (invites.some(i => i.status === "approved")) {
    return { blocked: false, reason: null, willDropOnSubmit: false };
  }

  if (invites.some(i => i.status === "pending")) {
    return { blocked: true, reason: "has_pending", willDropOnSubmit: false };
  }

  if (invites.length === 0) {
    return {
      blocked: true,
      reason: "missing_approved",
      willDropOnSubmit: false,
    };
  }

  const onlyTerminal = invites.every(i =>
    ["expired", "declined", "revoked"].includes(i.status)
  );
  if (onlyTerminal) {
    return {
      blocked: false,
      reason: "will_be_dropped",
      willDropOnSubmit: true,
    };
  }

  if (invites.some(i => i.status === "expired")) {
    return { blocked: true, reason: "has_expired", willDropOnSubmit: false };
  }

  if (invites.some(i => i.status === "declined")) {
    return { blocked: true, reason: "has_declined", willDropOnSubmit: false };
  }

  return {
    blocked: true,
    reason: "missing_approved",
    willDropOnSubmit: false,
  };
}

export function coOwnerBlockReasonMessage(reason: CoOwnerBlockReason): string {
  switch (reason) {
    case "missing_draft_key":
      return "Co-owner draft id missing — save to draft and try again";
    case "status_fetch_failed":
      return "Could not verify co-owner approval status";
    case "missing_approved":
      return "Co-owner must approve the email invite before you can submit";
    case "has_pending":
      return "All co-owner invites must be approved before submitting";
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
