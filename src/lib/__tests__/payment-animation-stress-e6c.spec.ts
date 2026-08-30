import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import { createAnimationQueue } from "@/lib/animation-queue-core";
import { clearPlaybackKeyState } from "@/lib/playback-key-lifecycle";
import {
  registerTipStreamConsumer,
  resetSharedTipStreamBrokerForTests,
  tipStreamBrokerMetrics,
} from "@/lib/shared-tip-stream-broker";
import { resetSharedTipGuardForTests } from "@/lib/animation-guard";
import { MAX_QUEUED_BATCHES } from "@/lib/animation-queue-core";

vi.stubGlobal("window", {
  dispatchEvent: vi.fn(() => true),
} as unknown as Window & typeof globalThis);

vi.mock("@/lib/pusher", () => {
  let handler: ((data: TipAnimationEvent) => void) | null = null;
  return {
    subscribeChannel: vi.fn(() => ({
      bind: vi.fn((_e: string, h: (data: TipAnimationEvent) => void) => {
        handler = h;
      }),
      unbind: vi.fn(() => {
        handler = null;
      }),
    })),
    unsubscribeChannel: vi.fn(),
    __emit: (data: TipAnimationEvent) => handler?.(data),
  };
});

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/animationDebug", () => ({
  animLog: vi.fn(),
  animWarn: vi.fn(),
}));

vi.mock("@/lib/realtime-telemetry", () => ({
  logRealtimeTelemetry: vi.fn(),
}));

function tip(seq: number): TipAnimationEvent {
  return {
    id: `bundle-${seq}`,
    seq,
    eventId: "evt-stress",
    serverTs: Date.now(),
    selectedTips: ["Heart"],
  };
}

describe("payment animation stress harness (Phase E6C)", () => {
  beforeEach(() => {
    resetSharedTipGuardForTests();
    resetSharedTipStreamBrokerForTests();
    clearPlaybackKeyState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetSharedTipStreamBrokerForTests();
    resetSharedTipGuardForTests();
    clearPlaybackKeyState();
  });

  it("10 rapid bundles produce 10 publications and no duplicate per seq", async () => {
    registerTipStreamConsumer({ eventId: "evt-stress", surface: "event_room" });
    const pusher = (await import(
      "@/lib/pusher"
    )) as typeof import("@/lib/pusher") & {
      __emit: (data: TipAnimationEvent) => void;
    };

    for (let seq = 1; seq <= 10; seq++) {
      pusher.__emit(tip(seq));
    }

    expect(tipStreamBrokerMetrics.rawReceiptCount).toBe(10);
    expect(tipStreamBrokerMetrics.publicationCount).toBe(10);
    expect(tipStreamBrokerMetrics.guardDecisionCount).toBe(10);
  });

  it("queue approaching capacity then full rejects without stall", async () => {
    const queue = createAnimationQueue({
      eventId: "evt-stress",
      getEnabled: () => true,
      surface: "room_messages",
    });

    let completed = 0;
    const hang = () =>
      new Promise<void>(() => {
        /* never resolves — simulates in-flight batch */
      });

    for (let i = 0; i < MAX_QUEUED_BATCHES; i++) {
      queue.enqueue([
        {
          playbackKey: `stress-${i}`,
          run: hang,
        },
      ]);
    }

    const rejected = queue.enqueue([
      {
        playbackKey: "stress-overflow",
        run: async () => {
          completed += 1;
        },
      },
    ]);

    expect(rejected.accepted).toBe(false);
    expect(queue.getPendingCount()).toBe(MAX_QUEUED_BATCHES);
    expect(completed).toBe(0);
  });
});
