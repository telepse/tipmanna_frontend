"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

const base = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export type WalletStatusResponse = {
  exists: boolean;
  status: string | null;
  balance: string;
};

export async function fetchWalletStatusAction() {
  return runServerFetch<WalletStatusResponse>(
    `${base()}/wallet`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "fetchWalletStatusAction"
  );
}

export async function setWalletPinAction(
  pin: string,
  kind?: "activation" | "pin_reset"
) {
  return runServerFetch<{ message?: string; expiresAt?: string }>(
    `${base()}/wallet/pin`,
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({ pin, kind }),
    },
    "setWalletPinAction"
  );
}

export async function verifyWalletTokenAction(token: string) {
  return runServerFetch<{ message?: string; verificationKind?: string }>(
    `${base()}/wallet/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    },
    "verifyWalletTokenAction"
  );
}

export async function debitWalletAction(body: {
  pin: string;
  amount: number;
  eventId: string;
  characters: Array<{
    name: string;
    time: string;
    price: number;
    characterId: string;
  }>;
  selectedTips?: string[];
  secondaryText?: string;
  paymentSurface?: string;
  paymentContentId?: string;
  playbackOffsetSec?: number;
  watchDurationBeforePayMs?: number;
  deviceCategory?: string;
  clientSessionId?: string;
  communityId?: string;
  idempotencyKey?: string;
  videoFeatureCardId?: string;
  tipQuoteId?: string;
  performerId?: string;
  projectId?: string;
}) {
  const idem = body.idempotencyKey?.trim();
  const headers = await serverAuthHeaders();
  if (idem) headers["Idempotency-Key"] = idem;

  return runServerFetch<{ transactionId: string; newBalance: string }>(
    `${base()}/wallet/debit`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
    "debitWalletAction"
  );
}

export type ReconcileWalletTopupResponse = {
  outcome: string;
  balance: string | null;
  stripeStatus: string;
};

export async function reconcileWalletTopupAction(paymentIntentId: string) {
  return runServerFetch<ReconcileWalletTopupResponse>(
    `${base()}/wallet/topup/reconcile`,
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({ paymentIntentId }),
    },
    "reconcileWalletTopupAction"
  );
}

export async function createWalletTopupIntentAction(body: {
  amount: number;
  eventId?: string;
}) {
  return runServerFetch<{ client_secret: string; transactionId: string }>(
    `${base()}/wallet/topup/create-intent`,
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify(body),
    },
    "createWalletTopupIntentAction"
  );
}

export type WalletLedgerRow = {
  id: string;
  kind: string;
  amount: string;
  balanceAfter: string;
  createdAt: string;
  eventId: string | null;
  stripePaymentIntentId?: string | null;
  tipTransactionId?: string | null;
};

export async function fetchWalletTransactionsAction() {
  return runServerFetch<{ items: WalletLedgerRow[] }>(
    `${base()}/wallet/transactions`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "fetchWalletTransactionsAction",
    raw => {
      const o = raw as { items?: WalletLedgerRow[] };
      return { items: Array.isArray(o.items) ? o.items : [] };
    }
  );
}
