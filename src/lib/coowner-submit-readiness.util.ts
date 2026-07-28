export type CoOwnerBlockReason =
  | "missing_draft_key"
  | "status_fetch_failed"
  | "missing_approved"
  | "has_pending"
  | "default_awaiting_approval";

export type CoOwnerSubmitReadiness = {
  blocked: boolean;
  reason: CoOwnerBlockReason | null;
};

type InviteRow = { status: string };

/** Single source of truth for co-owner submit readiness (mirrors backend rules). */
export function evaluateCoOwnerSubmitReadiness(
  invites: InviteRow[] | null | undefined
): CoOwnerSubmitReadiness {
  if (invites == null) {
    return { blocked: true, reason: "status_fetch_failed" };
  }

  if (invites.some(i => i.status === "pending")) {
    return { blocked: true, reason: "has_pending" };
  }

  if (!invites.some(i => i.status === "approved")) {
    return { blocked: true, reason: "missing_approved" };
  }

  return { blocked: false, reason: null };
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
    case "default_awaiting_approval":
      return "A video awaiting co-owner approval cannot be the default video";
  }
}
