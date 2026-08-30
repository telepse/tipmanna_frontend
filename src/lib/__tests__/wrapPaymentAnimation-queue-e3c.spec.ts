import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PAYMENT_WRAP } from "@/lib/animationContract";
import type { AnimationHandle } from "@/types/animation.types";
import { createAnimationQueue } from "@/lib/animation-queue-core";
import { clearPlaybackKeyState } from "@/lib/playback-key-lifecycle";
import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/animationDebug", () => ({
  animWarn: vi.fn(),
  animLog: vi.fn(),
}));

describe("wrapPaymentAnimation queue continuation (Phase E3C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPlaybackKeyState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("second character task runs after first character times out", async () => {
    let charAStarted = false;
    let charBStarted = false;

    const queue = createAnimationQueue({
      eventId: "evt-1",
      getEnabled: () => true,
      surface: "room_messages",
    });

    const hangForever: AnimationHandle = {
      stop: vi.fn(),
      finished: new Promise(() => {}),
    };

    const succeed: AnimationHandle = {
      stop: vi.fn(),
      finished: Promise.resolve(),
    };

    queue.enqueue([
      {
        playbackKey: "bundle-A",
        run: wrapPaymentAnimation(() => {
          charAStarted = true;
          return hangForever;
        }),
      },
      {
        playbackKey: "bundle-B",
        run: wrapPaymentAnimation(() => {
          charBStarted = true;
          return succeed;
        }),
      },
    ]);

    const cycleGap =
      PAYMENT_WRAP.betweenCyclesMs + PAYMENT_WRAP.secondCycleBeatMs;
    await vi.advanceTimersByTimeAsync(
      PAYMENT_WRAP.safetyTimeoutMs * 2 + cycleGap + 100
    );
    await vi.advanceTimersByTimeAsync(cycleGap + 100);
    await vi.runAllTimersAsync();

    expect(charAStarted).toBe(true);
    expect(charBStarted).toBe(true);
    expect(queue.getPendingCount()).toBe(0);
  });
});
