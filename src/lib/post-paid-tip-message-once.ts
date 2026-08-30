import {
  clearPendingTipBroadcast,
  readPendingTipBroadcast,
} from "@/lib/payment-origin";
import { readPendingPaymentReturn } from "@/lib/pending-payment-return";
import {
  sendTipMessageClient,
  type TipMessagePayload,
} from "@/lib/send-tip-message-client";

const SENT_PREFIX = "tipmanna_tip_message_sent:";
const DROPPED_PREFIX = "tipmanna_tip_dropped:";
const CLAIM_VALUE = "pending";
const SENT_VALUE = "1";

function sentKey(transactionId: string): string {
  return `${SENT_PREFIX}${transactionId}`;
}

function droppedKey(transactionId: string): string {
  return `${DROPPED_PREFIX}${transactionId}`;
}

/** Resolve Transaction.id from pending broadcast or redirect return snapshot. */
export function resolvePaidTipTransactionId(): string | null {
  const pending = readPendingTipBroadcast();
  const fromPending = pending?.transactionId?.trim();
  if (fromPending) return fromPending;
  const paymentReturn = readPendingPaymentReturn();
  return paymentReturn?.transactionId?.trim() || null;
}

export function isPaidTipMessageSent(transactionId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = sessionStorage.getItem(sentKey(transactionId));
    return value === SENT_VALUE || value === CLAIM_VALUE;
  } catch {
    return false;
  }
}

export function isTipDroppedForTransaction(transactionId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(droppedKey(transactionId)) === SENT_VALUE;
  } catch {
    return false;
  }
}

export function markTipDroppedForTransaction(transactionId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(droppedKey(transactionId), SENT_VALUE);
  } catch {
    /* ignore */
  }
}

/** Prior drop or successful POST already handled this redirect payment. */
export function isPaidTipDeliveryComplete(): boolean {
  const transactionId = resolvePaidTipTransactionId();
  if (!transactionId) return false;
  return (
    isPaidTipMessageSent(transactionId) ||
    isTipDroppedForTransaction(transactionId)
  );
}

function tryClaimSend(transactionId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = sentKey(transactionId);
    const existing = sessionStorage.getItem(key);
    if (existing === SENT_VALUE || existing === CLAIM_VALUE) return false;
    sessionStorage.setItem(key, CLAIM_VALUE);
    return true;
  } catch {
    return false;
  }
}

function markSendSucceeded(transactionId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(sentKey(transactionId), SENT_VALUE);
  } catch {
    /* ignore */
  }
}

function releaseSendClaim(transactionId: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = sentKey(transactionId);
    if (sessionStorage.getItem(key) === CLAIM_VALUE) {
      sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export type PostPaidTipMessageInput = Omit<TipMessagePayload, "transactionId"> & {
  transactionId?: string;
};

export type PostPaidTipMessageResult =
  | { ok: true; outcome: "posted" | "already_sent"; transactionId: string }
  | {
      ok: false;
      outcome: "skipped";
      reason: "no_transaction_id";
    }
  | { ok: false; outcome: "failed"; transactionId: string };

/**
 * Idempotent client POST /messages for paid tips.
 * Requires transactionId (from pending or payment return); skips uncorrelated posts.
 */
export async function postPaidTipMessageOnce(
  input: PostPaidTipMessageInput
): Promise<PostPaidTipMessageResult> {
  const transactionId =
    input.transactionId?.trim() || resolvePaidTipTransactionId();
  if (!transactionId) {
    return { ok: false, outcome: "skipped", reason: "no_transaction_id" };
  }

  if (sessionStorage.getItem(sentKey(transactionId)) === SENT_VALUE) {
    return { ok: true, outcome: "already_sent", transactionId };
  }

  if (!tryClaimSend(transactionId)) {
    return { ok: true, outcome: "already_sent", transactionId };
  }

  try {
    const res = await sendTipMessageClient({
      ...input,
      transactionId,
    });
    if (!res.ok) {
      releaseSendClaim(transactionId);
      return { ok: false, outcome: "failed", transactionId };
    }
    markSendSucceeded(transactionId);
    clearPendingTipBroadcast();
    return { ok: true, outcome: "posted", transactionId };
  } catch {
    releaseSendClaim(transactionId);
    return { ok: false, outcome: "failed", transactionId };
  }
}

/** Test-only reset for session locks. */
export function resetPaidTipMessageLocksForTests(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key?.startsWith(SENT_PREFIX) ||
        key?.startsWith(DROPPED_PREFIX)
      ) {
        keys.push(key);
      }
    }
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
