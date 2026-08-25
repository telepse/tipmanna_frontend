export type CoOwnerInviteStatusValue =
  | "pending"
  | "approved"
  | "declined"
  | "expired"
  | "revoked"
  | null;

export function coOwnerStatusIndicatorClass(
  status: CoOwnerInviteStatusValue
): string {
  if (status === "approved") return "border-green-500/70 bg-green-500/10";
  if (status === "pending") return "border-amber-500/70 bg-amber-500/10";
  if (status === "declined") return "border-red-500/70 bg-red-500/10";
  if (status === "expired") return "border-orange-500/70 bg-orange-500/10";
  if (status === "revoked") return "border-muted-foreground/40 bg-muted/20";
  return "";
}

export function coOwnerStatusLabel(status: CoOwnerInviteStatusValue): string {
  switch (status) {
    case "pending":
      return "Awaiting approval";
    case "approved":
      return "Approved";
    case "declined":
      return "Declined";
    case "expired":
      return "Invitation expired";
    case "revoked":
      return "Revoked";
    default:
      return "";
  }
}
