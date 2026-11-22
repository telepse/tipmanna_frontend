/**
 * Detect soft-deleted account rejection from V2 auth (ACCOUNT_DELETED).
 * Prefer this over navigating to a profile that 404s.
 */
export function accountDeletedMessageFromAuthFailure(input: {
  message?: string | null;
  httpStatus?: number;
  validationBody?: unknown;
}): string | null {
  const body = input.validationBody;
  const code =
    body &&
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    (body as { error?: { code?: unknown } }).error &&
    typeof (body as { error: { code?: unknown } }).error.code === "string"
      ? (body as { error: { code: string } }).error.code
      : body &&
          typeof body === "object" &&
          body !== null &&
          "code" in body &&
          typeof (body as { code?: unknown }).code === "string"
        ? (body as { code: string }).code
        : null;

  if (code === "ACCOUNT_DELETED") {
    return (
      input.message?.trim() ||
      "This account has been deleted and cannot be signed in."
    );
  }

  const msg = (input.message ?? "").toLowerCase();
  if (
    input.httpStatus === 401 &&
    msg.includes("deleted") &&
    msg.includes("account")
  ) {
    return (
      input.message?.trim() ||
      "This account has been deleted and cannot be signed in."
    );
  }

  return null;
}
