import { isPayerOriginRecoveryEnabled } from "@/lib/payer-origin-recovery-flag";
import {
  clearInvalidRecoveryState,
  clearRawRecoveryStateFromPendingReturn,
  readPendingPaymentReturn,
  patchPendingPaymentReturn,
} from "@/lib/pending-payment-return";
import { writePaymentRecoverySession } from "@/lib/payment-recovery-session";
import {
  exchangeRecoveryStateRequest,
  isDefinitiveExchangeRejection,
  isTransientExchangeFailure,
  traceRecoveryApiError,
} from "@/lib/payment-recovery-client";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";

export type ExchangeRecoveryOwnership = {
  tipperId?: string;
  visitorId?: string;
  clientSessionId?: string;
};

export type ExchangeRecoveryResult =
  | { outcome: "exchanged"; sessionStored: true }
  | { outcome: "no_recovery_state" }
  | { outcome: "skipped_flag_off" }
  | { outcome: "skipped_no_pending" }
  | { outcome: "definitive_rejection" }
  | { outcome: "transient_failure" }
  | { outcome: "legacy_continue" };

const EXCHANGE_MAX_ATTEMPTS = 3;

/**
 * Exchange raw recovery state for a short-lived session token on /success.
 * Never logs raw recovery state.
 */
export async function runPaymentRecoveryExchange(params: {
  stripePaymentIntentId: string | null;
  redirectStatus: string | null;
  ownership: ExchangeRecoveryOwnership;
}): Promise<ExchangeRecoveryResult> {
  if (!isPayerOriginRecoveryEnabled()) {
    return { outcome: "skipped_flag_off" };
  }

  const pending = readPendingPaymentReturn();
  if (!pending) {
    return { outcome: "skipped_no_pending" };
  }

  if (!pending.recoveryState?.trim()) {
    return { outcome: "no_recovery_state" };
  }

  const piId =
    params.stripePaymentIntentId?.trim() ||
    pending.stripePaymentIntentId?.trim();
  if (!piId) {
    return { outcome: "legacy_continue" };
  }

  patchPendingPaymentReturn({ stripePaymentIntentId: piId });

  let lastErr: unknown;
  for (let attempt = 0; attempt < EXCHANGE_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
    try {
      const { sessionToken, expiresAt } = await exchangeRecoveryStateRequest({
        recoveryState: pending.recoveryState,
        transactionId: pending.transactionId,
        stripePaymentIntentId: piId,
        eventId: pending.eventId,
        tipperId: params.ownership.tipperId,
        visitorId: params.ownership.visitorId,
        clientSessionId: params.ownership.clientSessionId,
      });

      writePaymentRecoverySession({
        sessionToken,
        expiresAt,
        transactionId: pending.transactionId,
        eventId: pending.eventId,
        stripePaymentIntentId: piId,
      });

      clearRawRecoveryStateFromPendingReturn();
      tracePaymentAnimation({
        stage: "payer_recovery_state_saved",
        transactionId: pending.transactionId,
        eventId: pending.eventId,
        surface: pending.paymentSurface,
        result: "exchange_ok",
      });

      return { outcome: "exchanged", sessionStored: true };
    } catch (err) {
      lastErr = err;
      if (isDefinitiveExchangeRejection(err)) {
        clearInvalidRecoveryState();
        traceRecoveryApiError("payer_recovery_exchange_failed", err, {
          transactionId: pending.transactionId,
          eventId: pending.eventId,
          result: "definitive_rejection",
        });
        return { outcome: "definitive_rejection" };
      }
      if (!isTransientExchangeFailure(err) || attempt === EXCHANGE_MAX_ATTEMPTS - 1) {
        break;
      }
    }
  }

  traceRecoveryApiError("payer_recovery_exchange_failed", lastErr, {
    transactionId: pending.transactionId,
    eventId: pending.eventId,
    result: "transient_failure",
  });
  return { outcome: "transient_failure" };
}

/** Strip Stripe return secrets from the browser history entry. */
export function sanitizeSuccessUrlInHistory(): void {
  if (typeof window === "undefined") return;
  try {
    const clean = `${window.location.origin}/success`;
    window.history.replaceState({}, "", clean);
  } catch {
    /* ignore */
  }
}

export function normalizePaymentOriginUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

export function isCurrentRoutePaymentOrigin(paymentOrigin: string): boolean {
  if (typeof window === "undefined") return false;
  return (
    normalizePaymentOriginUrl(window.location.href) ===
    normalizePaymentOriginUrl(paymentOrigin)
  );
}
