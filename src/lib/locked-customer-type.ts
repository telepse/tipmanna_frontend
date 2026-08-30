type HostUserLike = {
  numOfEvents?: number;
  lockedCustomerType?: "INDIVIDUAL" | "ORGANIZATION" | null;
  individualLegalFirstName?: string | null;
  individualLegalLastName?: string | null;
  organizationName?: string | null;
};

export function getLockedCustomerType(
  user?: HostUserLike | null
): "INDIVIDUAL" | "ORGANIZATION" | null {
  if (!user || (user.numOfEvents ?? 0) < 1) {
    return null;
  }

  if (
    user.lockedCustomerType === "INDIVIDUAL" ||
    user.lockedCustomerType === "ORGANIZATION"
  ) {
    return user.lockedCustomerType;
  }

  if (user.individualLegalFirstName && user.individualLegalLastName) {
    return "INDIVIDUAL";
  }

  if (user.organizationName) {
    return "ORGANIZATION";
  }

  return null;
}
