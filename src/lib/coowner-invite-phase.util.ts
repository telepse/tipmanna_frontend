/** Approved-wins invite row selection (matches submit readiness and backend partition). */

export type CoOwnerInvitePhaseStatus =
  | "pending"
  | "approved"
  | "expired"
  | "declined"
  | "revoked";

export type CoOwnerInviteRowLike = {
  status: string;
};

const ACTIVE_INVITE_STATUS_PRIORITY: readonly CoOwnerInvitePhaseStatus[] = [
  "approved",
  "pending",
  "expired",
  "declined",
  "revoked",
];

export function activeCoOwnerInviteRow<T extends CoOwnerInviteRowLike>(
  invites: T[] | null | undefined
): T | null {
  if (!invites?.length) return null;
  for (const status of ACTIVE_INVITE_STATUS_PRIORITY) {
    const row = invites.find(i => i.status === status);
    if (row) return row;
  }
  return null;
}

/** Phase for host invite widget; follows active row, not "any pending". */
export function coOwnerInvitePhaseFromRows(
  invites: CoOwnerInviteRowLike[] | null | undefined
): CoOwnerInvitePhaseStatus | "typing" {
  if (!invites?.length) return "typing";
  const active = activeCoOwnerInviteRow(invites);
  if (!active) return "typing";
  const status = active.status;
  if (
    status === "pending" ||
    status === "approved" ||
    status === "expired" ||
    status === "declined" ||
    status === "revoked"
  ) {
    return status;
  }
  return "typing";
}
