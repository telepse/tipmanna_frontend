/**
 * Session-scoped redirect return snapshot for Stripe PaymentIntent flows.
 * Raw recovery state lives here only — never Redux, analytics, logs or Pusher.
 */

export const PENDING_PAYMENT_RETURN_V1_KEY = "pending_payment_return_v1";

const MAX_AGE_MS = 15 * 60 * 1000;

export type PendingPaymentReturnV1 = {
  v: 1;
  transactionId: string;
  eventId: string;
  paymentOrigin: string;
  paymentSurface: string;
  /** Present only for redirect card flows when backend issued a credential. */
  recoveryState?: string;
  stripePaymentIntentId?: string;
  /** True when confirmPayment uses return_url (redirect), not wallet/no-redirect. */
  isRedirectPayment: boolean;
  /** Set on /success when server recovery exchange failed; enables local fallback only. */
  recoveryUnavailable?: boolean;
  createdAt: number;
};

export function writePendingPaymentReturn(
  payload: Omit<PendingPaymentReturnV1, "v" | "createdAt">
): void {
  if (typeof window === "undefined") return;
  try {
    if (
      !payload.transactionId?.trim() ||
      !payload.eventId?.trim() ||
      !payload.paymentOrigin?.trim() ||
      !payload.paymentSurface?.trim()
    ) {
      return;
    }
    const full: PendingPaymentReturnV1 = {
      v: 1,
      createdAt: Date.now(),
      ...payload,
    };
    sessionStorage.setItem(PENDING_PAYMENT_RETURN_V1_KEY, JSON.stringify(full));
  } catch {
    /* quota / private mode */
  }
}

export function readPendingPaymentReturn(): PendingPaymentReturnV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_RETURN_V1_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingPaymentReturnV1;
    if (
      p?.v !== 1 ||
      !p.transactionId?.trim() ||
      !p.eventId?.trim() ||
      !p.paymentOrigin?.trim() ||
      !p.paymentSurface?.trim()
    ) {
      sessionStorage.removeItem(PENDING_PAYMENT_RETURN_V1_KEY);
      return null;
    }
    if (Date.now() - (p.createdAt || 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_PAYMENT_RETURN_V1_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function patchPendingPaymentReturn(
  patch: Partial<
    Pick<
      PendingPaymentReturnV1,
      | "recoveryState"
      | "stripePaymentIntentId"
      | "paymentOrigin"
      | "recoveryUnavailable"
    >
  >
): void {
  const existing = readPendingPaymentReturn();
  if (!existing) return;
  writePendingPaymentReturn({ ...existing, ...patch });
}

export function clearRawRecoveryStateFromPendingReturn(): void {
  const existing = readPendingPaymentReturn();
  if (!existing) return;
  const { recoveryState: _removed, ...rest } = existing;
  writePendingPaymentReturn(rest);
}

export function clearPendingPaymentReturn(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_PAYMENT_RETURN_V1_KEY);
  } catch {
    /* ignore */
  }
}

export function clearInvalidRecoveryState(): void {
  clearRawRecoveryStateFromPendingReturn();
}

/** True when a Stripe redirect payer is still returning to their payment surface. */
export function isPayerPendingReturnTransaction(
  transactionId?: string | null
): boolean {
  const txId = transactionId?.trim();
  if (!txId) return false;
  const pending = readPendingPaymentReturn();
  return pending?.transactionId.trim() === txId;
}
