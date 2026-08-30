import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
}));

vi.mock("@/lib/reward-overlays/mount-web-reward-layers", () => ({
  startPaymentRewardOverlays: vi.fn(),
}));

vi.mock("@/lib/factory-to-style", () => ({
  createAnimationFromStyle: vi.fn(() => ({
    stop: vi.fn(),
    finished: Promise.resolve(),
  })),
}));

vi.mock("@/lib/wrapPaymentAnimation", () => ({
  wrapPaymentAnimation: (factory: () => unknown) => async () => {
    factory();
  },
}));

vi.mock("@/lib/tip-animation-characters", () => ({
  resolvePaymentCharactersForTip: vi.fn(
    (data: { selectedTips?: string[] }) => ({
      characters: (data.selectedTips ?? []).map(name => ({
        name,
        iconUrl: "/i.png",
        styleName: "Confetti",
      })),
      summary: {
        expectedCount: data.selectedTips?.length ?? 0,
        runnableCount: data.selectedTips?.length ?? 0,
        rejectedCount: 0,
        serverResolvedCount: 0,
        localFallbackCount: 0,
        unresolvedCount: 0,
        missingIconCount: 0,
        entries: [],
      },
    })
  ),
  resolveStyleCharactersForTip: vi.fn(),
}));

import { writePendingTipBroadcast } from "@/lib/payment-origin";
import {
  hasLocalFallbackPlayed,
  tryPayerLocalAnimationFallback,
} from "@/lib/payer-local-animation-fallback";
import { createAnimationQueue } from "@/lib/animation-queue-core";

describe("tryPayerLocalAnimationFallback", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubEnv("NEXT_PUBLIC_PAYER_LOCAL_ANIMATION_FALLBACK", "true");
    const localStorageMock = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", { localStorage: localStorageMock });
    writePendingTipBroadcast({
      eventId: "ev-1",
      selectedTips: ["Burger"],
      amount: 5,
      transactionId: "tx-fallback-1",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("enqueues once and marks played", () => {
    const queue = createAnimationQueue({
      eventId: "ev-1",
      getEnabled: () => true,
      surface: "explore_feed",
    });
    const characterMap = new Map([
      [
        "Burger",
        {
          id: "c-burger",
          name: "Burger",
          iconUrl: "/b.png",
          price: 5,
          styleName: "Confetti",
        },
      ],
    ]);

    const first = tryPayerLocalAnimationFallback({
      eventId: "ev-1",
      transactionId: "tx-fallback-1",
      characterMap,
      enqueue: queue.enqueue,
      surface: "explore_feed",
    });
    const second = tryPayerLocalAnimationFallback({
      eventId: "ev-1",
      transactionId: "tx-fallback-1",
      characterMap,
      enqueue: queue.enqueue,
      surface: "explore_feed",
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(hasLocalFallbackPlayed("tx-fallback-1")).toBe(true);
  });

  it("returns false when eventId mismatches", () => {
    const queue = createAnimationQueue({
      eventId: "ev-1",
      getEnabled: () => true,
      surface: "explore_feed",
    });
    const played = tryPayerLocalAnimationFallback({
      eventId: "other-event",
      transactionId: "tx-fallback-1",
      characterMap: new Map(),
      enqueue: queue.enqueue,
      surface: "explore_feed",
    });
    expect(played).toBe(false);
  });
});
