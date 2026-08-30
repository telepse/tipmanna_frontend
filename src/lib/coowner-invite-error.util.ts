import { parseServerValidationErrors } from "@/lib/form-error-mapper";

export type CoOwnerInviteField = "email" | "name";

export type CoOwnerInviteFieldErrors = Partial<
  Record<CoOwnerInviteField, string>
>;

/** Map invite API validation body or message to co-owner email/name field errors. */
export function mapCoOwnerInviteErrors(
  body: unknown,
  fallbackMessage?: string
): CoOwnerInviteFieldErrors {
  const rows = parseServerValidationErrors(body);
  const out: CoOwnerInviteFieldErrors = {};

  for (const row of rows) {
    const path = row.path?.trim() ?? "";
    const msg = row.message?.trim();
    if (!msg) continue;
    if (path === "coOwnerEmail" || path.endsWith(".coOwnerEmail")) {
      out.email = msg;
    } else if (path === "coOwnerName" || path.endsWith(".coOwnerName")) {
      out.name = msg;
    }
  }

  if (Object.keys(out).length > 0) return out;

  const message =
    fallbackMessage ??
    (body &&
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error?: { message?: string } }).error?.message ===
      "string"
      ? (body as { error: { message: string } }).error.message
      : typeof (body as { message?: string })?.message === "string"
        ? (body as { message: string }).message
        : "");

  if (!message) return out;

  if (
    message.includes("Co-owner email exists with name") ||
    message.includes("co-owner name is already used")
  ) {
    out.name = message;
  } else if (
    message.includes("co-owner email already has an invite") ||
    message.includes("cannot invite yourself") ||
    message.includes("already has an approved co-owner on Tipmanna")
  ) {
    out.email = message;
  } else if (message.includes("email required") || message.includes("email")) {
    out.email = message;
  } else if (message.includes("name required") || message.includes("name")) {
    out.name = message;
  }

  return out;
}
