import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomCharacter } from "@/types";
import type { TipAnimationEvent } from "@/lib/animation-guard";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/realtime-telemetry", () => ({
  logRealtimeTelemetry: vi.fn(),
}));

vi.mock("@/lib/reward-overlays/mount-web-reward-layers", () => ({
  startPaymentRewardOverlays: vi.fn(),
}));

const wrapPaymentAnimationMock = vi.fn(
  (_factory: () => unknown) => async () => undefined
);

vi.mock("@/lib/wrapPaymentAnimation", () => ({
  wrapPaymentAnimation: (factory: () => unknown) =>
    wrapPaymentAnimationMock(factory),
}));

vi.mock("@/lib/factory-to-style", () => ({
  createAnimationFromStyle: vi.fn(),
}));

vi.mock("@/lib/tip-animation-characters", () => ({
  resolvePaymentCharactersForTip: vi.fn(() => ({
    characters: [
      {
        name: "Heart",
        iconUrl: "/heart.png",
        styleName: "Confetti",
      },
    ],
    summary: {
      expectedCount: 1,
      serverResolvedCount: 0,
      localFallbackCount: 1,
      runnableCount: 1,
      rejectedCount: 0,
      unresolvedCount: 0,
      missingIconCount: 0,
      entries: [],
    },
  })),
  resolveStyleCharactersForTip: vi.fn(),
}));

vi.mock("@/lib/payment-style-preflight", () => ({
  preflightPaymentCharacterStyles: vi.fn((characters: unknown[]) => ({
    accepted: characters,
    rejections: [],
  })),
}));

import { enqueuePaymentBundleForValidatedTip } from "@/lib/run-payment-bundle-animations";
import { createAnimationQueue } from "@/lib/animation-queue-core";
import { clearPlaybackKeyState } from "@/lib/playback-key-lifecycle";
import {
  clearPendingPaymentReturn,
  writePendingPaymentReturn,
} from "@/lib/pending-payment-return";

const validCharacter: RoomCharacter = {
  id: "c1",
  name: "Heart",
  styleName: "Confetti",
  iconUrl: "/heart.png",
  price: 1,
};

describe("payer pending return segment bypass", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    clearPlaybackKeyState();
    clearPendingPaymentReturn();
    storage.clear();
    const sessionStorageMock = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    };
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    vi.stubGlobal("window", { sessionStorage: sessionStorageMock });
  });

  it("plays animation for stale segment when transaction matches pending return", () => {
    writePendingPaymentReturn({
      transactionId: "tx-return-1",
      eventId: "evt-1",
      paymentOrigin: "http://localhost/tv",
      paymentSurface: "tv_looper",
      isRedirectPayment: true,
    });

    const bundle: TipAnimationEvent = {
      id: "bundle-stale",
      seq: 1,
      eventId: "evt-1",
      transactionId: "tx-return-1",
      serverTs: Date.now() - 60_000,
      playbackEndsAt: Date.now() - 30_000,
      selectedTips: ["Heart"],
    };

    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
      surface: "tv_looper",
    });

    enqueuePaymentBundleForValidatedTip({
      data: bundle,
      characterMap: new Map([[validCharacter.name, validCharacter]]),
      buildDedupeKey: name => `${bundle.id}-${name}`,
      enqueue: queue.enqueue,
      surface: "tv_looper",
      bundleRunContext: { deliverySource: "realtime" },
    });

    expect(wrapPaymentAnimationMock).toHaveBeenCalled();
  });
});
