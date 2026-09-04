import { isEmailVerificationRequiredError } from "@/lib/authorization-policy";
import { authErrorCodeFromActionResult } from "@/lib/host-auth-fetch";
import { notifyEmailVerificationRequired } from "@/lib/email-verification-events";

export type ActionFailureLike = {
  error?: string | null;
  message?: string | null;
  validationBody?: unknown;
};

/** Returns true when handled — caller should stop and skip its toast. */
export function detectEmailVerificationRequired(
  result: ActionFailureLike,
  options?: { next?: string; accountType?: "TIPPER" | "HOST" }
): boolean {
  const { code, email } = authErrorCodeFromActionResult(result);
  if (!isEmailVerificationRequiredError(code)) return false;
  notifyEmailVerificationRequired({
    email,
    accountType: options?.accountType,
    next: options?.next,
  });
  return true;
}

/** Parse a failed fetch Response body and fire the global handler if needed. */
export async function assertNotEmailVerificationRequiredFromResponse(
  res: Response,
  options?: { next?: string; accountType?: "TIPPER" | "HOST" }
): Promise<boolean> {
  if (res.ok) return false;
  try {
    const body = await res.clone().json();
    return detectEmailVerificationRequired({ validationBody: body }, options);
  } catch {
    return false;
  }
}
