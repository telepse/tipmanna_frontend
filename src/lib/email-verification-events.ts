export const EMAIL_VERIFICATION_REQUIRED_EVENT =
  "tipmanna:email-verification-required";

export type EmailVerificationRequiredDetail = {
  email?: string;
  accountType?: "TIPPER" | "HOST";
  next?: string;
};

export function notifyEmailVerificationRequired(
  detail: EmailVerificationRequiredDetail
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<EmailVerificationRequiredDetail>(
      EMAIL_VERIFICATION_REQUIRED_EVENT,
      { detail }
    )
  );
}
