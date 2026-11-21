import {
  createWalletTopupIntentAction,
  debitWalletAction,
  fetchWalletStatusAction,
  fetchWalletTransactionsAction,
  reconcileWalletTopupAction,
  setWalletPinAction,
  verifyWalletTokenAction,
  type ReconcileWalletTopupResponse,
  type WalletLedgerRow,
  type WalletStatusResponse,
} from "@/actions/wallet";

export type {
  ReconcileWalletTopupResponse,
  WalletLedgerRow,
  WalletStatusResponse,
};

export async function fetchWalletStatus(): Promise<WalletStatusResponse | null> {
  const res = await fetchWalletStatusAction();
  if (!res.success || !res.data) return null;
  return res.data;
}

export async function setWalletPinRequest(
  pin: string,
  kind?: "activation" | "pin_reset"
): Promise<{ message?: string; expiresAt?: string }> {
  const res = await setWalletPinAction(pin, kind);
  if (!res.success) {
    throw new Error(res.error || "Wallet PIN request failed");
  }
  return res.data ?? {};
}

export async function verifyWalletTokenRequest(token: string): Promise<{
  message?: string;
  verificationKind?: string;
}> {
  const res = await verifyWalletTokenAction(token);
  if (!res.success) {
    throw new Error(res.error || "Verification failed");
  }
  return res.data ?? {};
}

export class WalletDebitRequestError extends Error {
  readonly httpStatus?: number;

  constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = "WalletDebitRequestError";
    this.httpStatus = httpStatus;
  }
}

export async function debitWalletRequest(body: {
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
}): Promise<{ transactionId: string; newBalance: string }> {
  const res = await debitWalletAction(body);
  if (!res.success || !res.data) {
    throw new WalletDebitRequestError(
      res.error || "Wallet payment failed",
      res.httpStatus
    );
  }
  return res.data;
}

export async function reconcileWalletTopupRequest(
  paymentIntentId: string
): Promise<ReconcileWalletTopupResponse> {
  const res = await reconcileWalletTopupAction(paymentIntentId);
  if (!res.success || !res.data) {
    throw new Error(res.error || "Wallet reconcile failed");
  }
  return res.data;
}

export async function createWalletTopupIntentRequest(body: {
  amount: number;
  eventId?: string;
}): Promise<{ client_secret: string; transactionId: string }> {
  const res = await createWalletTopupIntentAction(body);
  if (!res.success || !res.data) {
    throw new Error(res.error || "Top-up failed");
  }
  return res.data;
}

export async function fetchWalletTransactions(): Promise<{
  items: WalletLedgerRow[];
  error: string | null;
}> {
  const res = await fetchWalletTransactionsAction();
  if (!res.success) {
    return {
      items: [],
      error: res.error || "Could not load transactions",
    };
  }
  return {
    items: res.data?.items ?? [],
    error: null,
  };
}
