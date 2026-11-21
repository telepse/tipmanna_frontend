import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  clearWalletDebitPendingIdempotency,
  hashWalletDebitAttemptIdentity,
  planWalletDebitIdempotencyKey,
  readWalletDebitPendingRecord,
  rememberWalletDebitPendingTipQuoteId,
  resetWalletDebitPendingIdempotencyForTests,
  resolveWalletDebitPendingTipQuoteId,
  walletDebitFailureDisposition,
  type WalletDebitAttemptIdentity,
} from "@/lib/wallet-debit-pending-idempotency";

const baseIdentity = (): WalletDebitAttemptIdentity => ({
  eventId: "11111111-1111-4111-8111-111111111111",
  amount: 5,
  characters: [
    {
      characterId: "22222222-2222-4222-8222-222222222222",
      name: "Heart",
      price: 5,
      time: "5s",
    },
  ],
  paymentSurface: "tv",
  paymentContentId: "33333333-3333-4333-8333-333333333333",
});

describe("wallet-debit-pending-idempotency", () => {
  beforeEach(() => {
    resetWalletDebitPendingIdempotencyForTests();
  });

  it("reuses the same key for the same logical debit on retry", () => {
    const identity = baseIdentity();
    const first = planWalletDebitIdempotencyKey(identity);
    const second = planWalletDebitIdempotencyKey(identity);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
  });

  it("issues a new key when debit-defining fields change", () => {
    const identity = baseIdentity();
    const first = planWalletDebitIdempotencyKey(identity);
    const changed = planWalletDebitIdempotencyKey({
      ...identity,
      amount: 10,
    });
    expect(changed.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it("does not change key after success path clears pending", () => {
    const identity = baseIdentity();
    const first = planWalletDebitIdempotencyKey(identity);
    clearWalletDebitPendingIdempotency();
    const afterSuccess = planWalletDebitIdempotencyKey(identity);
    expect(afterSuccess.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it("keeps pending key after ambiguous network failure disposition", () => {
    planWalletDebitIdempotencyKey(baseIdentity());
    expect(walletDebitFailureDisposition(undefined)).toBe("keep_pending");
    expect(walletDebitFailureDisposition(500)).toBe("keep_pending");
    expect(walletDebitFailureDisposition(409)).toBe("keep_pending");
    expect(readWalletDebitPendingRecord()?.idempotencyKey).toBeTruthy();
  });

  it("clears pending on terminal auth or fingerprint mismatch", () => {
    planWalletDebitIdempotencyKey(baseIdentity());
    expect(walletDebitFailureDisposition(422)).toBe("clear_pending");
    expect(walletDebitFailureDisposition(401)).toBe("clear_pending");
    expect(walletDebitFailureDisposition(400)).toBe("keep_pending");
  });

  it("persists tipQuoteId for quote-backed retries without storing PIN", () => {
    const identity = baseIdentity();
    planWalletDebitIdempotencyKey(identity);
    rememberWalletDebitPendingTipQuoteId(
      identity,
      "44444444-4444-4444-8444-444444444444"
    );
    expect(resolveWalletDebitPendingTipQuoteId(identity)).toBe(
      "44444444-4444-4444-8444-444444444444"
    );
    const record = readWalletDebitPendingRecord();
    expect(record).toBeTruthy();
    expect(record).not.toHaveProperty("pin");
    expect(JSON.stringify(record).toLowerCase()).not.toContain("pin");
  });

  it("character order does not affect identity hash", () => {
    const a = hashWalletDebitAttemptIdentity({
      ...baseIdentity(),
      characters: [
        {
          characterId: "b",
          name: "B",
          price: 1,
          time: "1s",
        },
        {
          characterId: "a",
          name: "A",
          price: 2,
          time: "2s",
        },
      ],
    });
    const b = hashWalletDebitAttemptIdentity({
      ...baseIdentity(),
      characters: [
        {
          characterId: "a",
          name: "A",
          price: 2,
          time: "2s",
        },
        {
          characterId: "b",
          name: "B",
          price: 1,
          time: "1s",
        },
      ],
    });
    expect(a).toBe(b);
  });

  it("survives reload via sessionStorage read", () => {
    const identity = baseIdentity();
    const { idempotencyKey } = planWalletDebitIdempotencyKey(identity);
    const reloaded = planWalletDebitIdempotencyKey(identity);
    expect(reloaded.idempotencyKey).toBe(idempotencyKey);
  });
});

describe("TipperWalletDialog wallet debit contract (source)", () => {
  it("uses retry-stable idempotency planning and clears on success", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "src/components/payments/tipper-wallet-entry.tsx"
      ),
      "utf8"
    );
    expect(src).toContain("planWalletDebitIdempotencyKey");
    expect(src).toContain("clearWalletDebitPendingIdempotency");
    expect(src).toContain("walletDebitFailureDisposition");
    expect(src).not.toContain("crypto.randomUUID");
  });
});
