/**
 * Short-lived recovery session token (Bearer fallback) stored in sessionStorage.
 * Never log the token; HttpOnly cookie is managed by the backend.
 */

export const PAYMENT_RECOVERY_SESSION_V1_KEY = "payment_recovery_session_v1";

export type PaymentRecoverySessionV1 = {
  v: 1;
  sessionToken: string;
  expiresAt: string;
  transactionId: string;
  eventId: string;
  stripePaymentIntentId: string;
  /** Prevents replay after successful recovery in this tab. */
  recoveryCompleted?: boolean;
};

export function writePaymentRecoverySession(
  payload: Omit<PaymentRecoverySessionV1, "v">
): void {
  if (typeof window === "undefined") return;
  try {
    if (!payload.sessionToken?.trim() || !payload.transactionId?.trim()) {
      return;
    }
    const full: PaymentRecoverySessionV1 = { v: 1, ...payload };
    sessionStorage.setItem(
      PAYMENT_RECOVERY_SESSION_V1_KEY,
      JSON.stringify(full)
    );
  } catch {
    /* ignore */
  }
}

export function readPaymentRecoverySession(): PaymentRecoverySessionV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PAYMENT_RECOVERY_SESSION_V1_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PaymentRecoverySessionV1;
    if (p?.v !== 1 || !p.sessionToken?.trim() || !p.transactionId?.trim()) {
      sessionStorage.removeItem(PAYMENT_RECOVERY_SESSION_V1_KEY);
      return null;
    }
    if (p.expiresAt && Date.parse(p.expiresAt) < Date.now()) {
      sessionStorage.removeItem(PAYMENT_RECOVERY_SESSION_V1_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function markPaymentRecoverySessionCompleted(): void {
  const existing = readPaymentRecoverySession();
  if (!existing) return;
  writePaymentRecoverySession({ ...existing, recoveryCompleted: true });
}

export function clearPaymentRecoverySession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PAYMENT_RECOVERY_SESSION_V1_KEY);
  } catch {
    /* ignore */
  }
}
