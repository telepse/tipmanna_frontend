import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PENDING_PAYMENT_RETURN_V1_KEY } from "@/lib/pending-payment-return";
import { PENDING_TIP_BROADCAST_V1_KEY } from "@/lib/payment-origin";

vi.mock("@/lib/send-tip-message-client", () => ({
  sendTipMessageClient: vi.fn(),
}));

import { sendTipMessageClient } from "@/lib/send-tip-message-client";
import {
  isPaidTipDeliveryComplete,
  isPaidTipMessageSent,
  isTipDroppedForTransaction,
  markTipDroppedForTransaction,
  postPaidTipMessageOnce,
  resetPaidTipMessageLocksForTests,
  resolvePaidTipTransactionId,
} from "@/lib/post-paid-tip-message-once";

const TX = "tx-abc-123";

const basePayload = {
  eventId: "event-1",
  sender: "tipper",
  text: "I just sent",
  tip: 5,
  selectedTips: ["Heart"],
  purchasedSummary: "1 Heart",
};

function makeStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("postPaidTipMessageOnce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const sessionStorageMock = makeStorageMock();
    const localStorageMock = makeStorageMock();
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      sessionStorage: sessionStorageMock,
      localStorage: localStorageMock,
    });
    resetPaidTipMessageLocksForTests();
  });

  afterEach(() => {
    resetPaidTipMessageLocksForTests();
    vi.unstubAllGlobals();
  });

  it("resolves transactionId from pending broadcast then payment return", () => {
    window.sessionStorage.setItem(
      PENDING_PAYMENT_RETURN_V1_KEY,
      JSON.stringify({
        v: 1,
        transactionId: "from-return",
        eventId: "event-1",
        paymentOrigin: "stripe",
        paymentSurface: "tv",
        isRedirectPayment: true,
        createdAt: Date.now(),
      })
    );
    expect(resolvePaidTipTransactionId()).toBe("from-return");

    window.localStorage.setItem(
      PENDING_TIP_BROADCAST_V1_KEY,
      JSON.stringify({
        v: 1,
        transactionId: "from-broadcast",
        eventId: "event-1",
        selectedTips: ["Heart"],
        amount: 5,
        createdAt: Date.now(),
      })
    );
    expect(resolvePaidTipTransactionId()).toBe("from-broadcast");
  });

  it("skips POST when transactionId is missing", async () => {
    const result = await postPaidTipMessageOnce(basePayload);
    expect(result).toEqual({
      ok: false,
      outcome: "skipped",
      reason: "no_transaction_id",
    });
    expect(sendTipMessageClient).not.toHaveBeenCalled();
  });

  it("posts once and sets sent-lock on success", async () => {
    window.localStorage.setItem(
      PENDING_TIP_BROADCAST_V1_KEY,
      JSON.stringify({
        v: 1,
        transactionId: TX,
        eventId: "event-1",
        selectedTips: ["Heart"],
        amount: 5,
        createdAt: Date.now(),
      })
    );
    vi.mocked(sendTipMessageClient).mockResolvedValue({
      ok: true,
    } as Response);

    const payloadWithTx = { ...basePayload, transactionId: TX };

    const first = await postPaidTipMessageOnce(payloadWithTx);
    expect(first).toMatchObject({ ok: true, outcome: "posted", transactionId: TX });
    expect(sendTipMessageClient).toHaveBeenCalledTimes(1);
    expect(isPaidTipMessageSent(TX)).toBe(true);

    const second = await postPaidTipMessageOnce(payloadWithTx);
    expect(second).toMatchObject({
      ok: true,
      outcome: "already_sent",
      transactionId: TX,
    });
    expect(sendTipMessageClient).toHaveBeenCalledTimes(1);
  });

  it("releases claim on failed POST so a retry can proceed", async () => {
    window.localStorage.setItem(
      PENDING_TIP_BROADCAST_V1_KEY,
      JSON.stringify({
        v: 1,
        transactionId: TX,
        eventId: "event-1",
        selectedTips: ["Heart"],
        amount: 5,
        createdAt: Date.now(),
      })
    );
    vi.mocked(sendTipMessageClient)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    const failed = await postPaidTipMessageOnce(basePayload);
    expect(failed).toMatchObject({ ok: false, outcome: "failed", transactionId: TX });
    expect(isPaidTipMessageSent(TX)).toBe(false);

    const retry = await postPaidTipMessageOnce(basePayload);
    expect(retry).toMatchObject({ ok: true, outcome: "posted", transactionId: TX });
    expect(sendTipMessageClient).toHaveBeenCalledTimes(2);
  });

  it("treats dropped-for-tx as delivery complete across remount", () => {
    window.localStorage.setItem(
      PENDING_TIP_BROADCAST_V1_KEY,
      JSON.stringify({
        v: 1,
        transactionId: TX,
        eventId: "event-1",
        selectedTips: ["Heart"],
        amount: 5,
        createdAt: Date.now(),
      })
    );
    markTipDroppedForTransaction(TX);
    expect(isTipDroppedForTransaction(TX)).toBe(true);
    expect(isPaidTipDeliveryComplete()).toBe(true);
  });
});
