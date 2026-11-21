/**
 * Retry-stable Idempotency-Key for web wallet debits (Batch 4B-6).
 * Persists only idempotency key + debit identity hash (+ optional tipQuoteId). Never PIN or tokens.
 * Uses sessionStorage so pending survives reload in the same tab; cleared when the tab session ends.
 */

export type WalletDebitAttemptIdentity = {
  eventId: string;
  amount: number;
  characters: Array<{
    characterId: string;
    name: string;
    price: number;
    time: string;
  }>;
  paymentSurface: string;
  paymentContentId?: string;
  communityId?: string;
  videoFeatureCardId?: string;
  performerId?: string;
  projectId?: string;
  selectedTips?: string[];
  secondaryText?: string;
};

export type WalletDebitPendingRecord = {
  idempotencyKey: string;
  identityHash: string;
  tipQuoteId?: string;
};

const STORAGE_KEY = "walletDebitPendingIdempotency_v1";

let memoryFallback: WalletDebitPendingRecord | null = null;

export function resetWalletDebitPendingIdempotencyForTests(): void {
  memoryFallback = null;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

function readStorage(): WalletDebitPendingRecord | null {
  if (typeof sessionStorage !== "undefined") {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WalletDebitPendingRecord;
        if (
          typeof parsed.idempotencyKey === "string" &&
          parsed.idempotencyKey.trim() &&
          typeof parsed.identityHash === "string" &&
          parsed.identityHash.length > 0
        ) {
          return {
            idempotencyKey: parsed.idempotencyKey.trim(),
            identityHash: parsed.identityHash,
            ...(typeof parsed.tipQuoteId === "string" &&
            parsed.tipQuoteId.trim()
              ? { tipQuoteId: parsed.tipQuoteId.trim() }
              : {}),
          };
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }
  return memoryFallback;
}

function writeStorage(record: WalletDebitPendingRecord | null): void {
  memoryFallback = record;
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!record) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* quota / private mode — memory fallback remains */
  }
}

export function clearWalletDebitPendingIdempotency(): void {
  writeStorage(null);
}

export function readWalletDebitPendingRecord(): WalletDebitPendingRecord | null {
  return readStorage();
}

/** Stable digest of debit-defining fields (no PIN, tokens, or analytics-only fields). */
export function hashWalletDebitAttemptIdentity(
  identity: WalletDebitAttemptIdentity
): string {
  const canonical = canonicalizeWalletDebitAttemptIdentity(identity);
  return fnv1aHex(canonical);
}

function canonicalizeWalletDebitAttemptIdentity(
  identity: WalletDebitAttemptIdentity
): string {
  const characters = [...identity.characters]
    .map(c => ({
      characterId: c.characterId.trim(),
      name: c.name.trim(),
      price: normalizeAmount(c.price),
      time: c.time.trim(),
    }))
    .sort(
      (a, b) =>
        a.characterId.localeCompare(b.characterId) ||
        a.name.localeCompare(b.name) ||
        a.time.localeCompare(b.time)
    );

  const selectedTips =
    identity.selectedTips && identity.selectedTips.length > 0
      ? [...identity.selectedTips].map(s => s.trim()).sort()
      : undefined;

  const payload: Record<string, unknown> = {
    amount: normalizeAmount(identity.amount),
    characters,
    eventId: identity.eventId.trim(),
    paymentSurface: identity.paymentSurface.trim(),
  };

  const optional: Record<string, unknown> = {
    communityId: optionalTrim(identity.communityId),
    paymentContentId: optionalTrim(identity.paymentContentId),
    performerId: optionalTrim(identity.performerId),
    projectId: optionalTrim(identity.projectId),
    secondaryText: optionalTrim(identity.secondaryText),
    selectedTips,
    videoFeatureCardId: optionalTrim(identity.videoFeatureCardId),
  };

  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  return JSON.stringify(payload);
}

function normalizeAmount(value: number): string {
  return Number(value).toFixed(2);
}

function optionalTrim(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** FNV-1a 32-bit hex — deterministic without async Web Crypto in browser tests. */
function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function newWalletDebitIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

/**
 * One idempotency key per logical debit identity; reused until success or terminal clear.
 */
export function planWalletDebitIdempotencyKey(
  identity: WalletDebitAttemptIdentity
): { idempotencyKey: string; identityHash: string } {
  const identityHash = hashWalletDebitAttemptIdentity(identity);
  const existing = readStorage();
  if (existing && existing.identityHash === identityHash) {
    return { idempotencyKey: existing.idempotencyKey, identityHash };
  }
  const idempotencyKey = newWalletDebitIdempotencyKey();
  writeStorage({
    idempotencyKey,
    identityHash,
    ...(existing?.identityHash === identityHash
      ? { tipQuoteId: existing.tipQuoteId }
      : {}),
  });
  return { idempotencyKey, identityHash };
}

/** Attach server quote to pending attempt so retries match backend fingerprint. */
export function rememberWalletDebitPendingTipQuoteId(
  identity: WalletDebitAttemptIdentity,
  tipQuoteId: string
): void {
  const identityHash = hashWalletDebitAttemptIdentity(identity);
  const existing = readStorage();
  if (!existing || existing.identityHash !== identityHash) return;
  writeStorage({
    ...existing,
    tipQuoteId: tipQuoteId.trim(),
  });
}

export function resolveWalletDebitPendingTipQuoteId(
  identity: WalletDebitAttemptIdentity
): string | undefined {
  const identityHash = hashWalletDebitAttemptIdentity(identity);
  const existing = readStorage();
  if (!existing || existing.identityHash !== identityHash) return undefined;
  return existing.tipQuoteId;
}

export type WalletDebitFailureDisposition = "keep_pending" | "clear_pending";

/**
 * Classify debit failures for pending-key lifecycle (conservative for money).
 * - Network / timeout / 5xx / 409: keep key (server may have committed or reservation active).
 * - 400: keep key (backend releases IN_PROGRESS on safe 4xx; same key may retry).
 * - 422: clear (key bound to different body).
 * - 401 / 403: clear (auth boundary).
 */
export function walletDebitFailureDisposition(
  httpStatus: number | undefined
): WalletDebitFailureDisposition {
  if (httpStatus == null) return "keep_pending";
  if (httpStatus === 422 || httpStatus === 401 || httpStatus === 403) {
    return "clear_pending";
  }
  return "keep_pending";
}
