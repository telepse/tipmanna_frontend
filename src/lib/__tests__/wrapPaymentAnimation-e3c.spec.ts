import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PAYMENT_WRAP } from "@/lib/animationContract";
import type { AnimationHandle } from "@/types/animation.types";
import {
  derivePaymentCharacterPlaybackResult,
  shouldAttemptCycleTwo,
} from "@/lib/payment-animation-outcomes";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/animationDebug", () => ({
  animWarn: vi.fn(),
  animLog: vi.fn(),
}));

import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";

function makeHandle(
  finished: Promise<void> = Promise.resolve()
): AnimationHandle {
  return {
    stop: vi.fn(),
    finished,
  };
}

describe("payment-animation-outcomes helpers", () => {
  it("shouldAttemptCycleTwo allows completed and timed_out only", () => {
    expect(shouldAttemptCycleTwo("completed")).toBe(true);
    expect(shouldAttemptCycleTwo("timed_out")).toBe(true);
    expect(shouldAttemptCycleTwo("factory_failed")).toBe(false);
    expect(shouldAttemptCycleTwo("invalid_handle")).toBe(false);
    expect(shouldAttemptCycleTwo("finished_rejected")).toBe(false);
  });

  it("derivePaymentCharacterPlaybackResult maps both completed to completed", () => {
    expect(derivePaymentCharacterPlaybackResult("completed", "completed")).toBe(
      "completed"
    );
  });

  it("derivePaymentCharacterPlaybackResult maps mixed outcomes to partially_completed", () => {
    expect(derivePaymentCharacterPlaybackResult("timed_out", "completed")).toBe(
      "partially_completed"
    );
    expect(derivePaymentCharacterPlaybackResult("completed", "timed_out")).toBe(
      "partially_completed"
    );
  });

  it("derivePaymentCharacterPlaybackResult maps dual timeout to failed", () => {
    expect(derivePaymentCharacterPlaybackResult("timed_out", "timed_out")).toBe(
      "failed"
    );
  });

  it("derivePaymentCharacterPlaybackResult maps cycle1 failure to failed", () => {
    expect(derivePaymentCharacterPlaybackResult("factory_failed", null)).toBe(
      "failed"
    );
  });
});

describe("wrapPaymentAnimation honest outcomes (Phase E3C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function collectTraces(run: () => Promise<void>) {
    const traces: Array<{
      stage: string;
      result?: string;
      [k: string]: unknown;
    }> = [];
    const { tracePaymentAnimation } = await import(
      "@/lib/payment-animation-trace"
    );
    vi.mocked(tracePaymentAnimation).mockImplementation(payload => {
      traces.push(payload as (typeof traces)[number]);
    });
    await run();
    return traces;
  }

  it("two natural successes emit double-cycle completed and character completed", async () => {
    let call = 0;
    const run = wrapPaymentAnimation(() => {
      call++;
      return makeHandle(Promise.resolve());
    });

    const traces = await collectTraces(async () => {
      const p = run();
      await vi.advanceTimersByTimeAsync(
        PAYMENT_WRAP.betweenCyclesMs + PAYMENT_WRAP.secondCycleBeatMs + 100
      );
      await p;
    });

    expect(call).toBe(2);
    expect(
      traces.filter(t => t.stage === "payment_cycle_completed")
    ).toHaveLength(2);
    expect(traces.some(t => t.stage === "payment_double_cycle_completed")).toBe(
      true
    );
    expect(
      traces.find(t => t.stage === "payment_character_playback_finished")
        ?.result
    ).toBe("completed");
  });

  it("timeout then success is partially_completed without double-cycle completed", async () => {
    let call = 0;
    const run = wrapPaymentAnimation(() => {
      call++;
      if (call === 1) {
        return makeHandle(new Promise(() => {}));
      }
      return makeHandle(Promise.resolve());
    });

    const pending = collectTraces(async () => {
      const p = run();
      await vi.advanceTimersByTimeAsync(PAYMENT_WRAP.safetyTimeoutMs + 500);
      await p;
    });
    const traces = await pending;

    expect(traces.some(t => t.stage === "payment_double_cycle_completed")).toBe(
      false
    );
    expect(
      traces.find(t => t.stage === "payment_character_playback_finished")
        ?.result
    ).toBe("partially_completed");
    expect(traces.filter(t => t.cycleOutcome === "timed_out")).toHaveLength(1);
    expect(traces.filter(t => t.cycleOutcome === "completed")).toHaveLength(1);
  });

  it("both cycles timeout yields failed without double-cycle completed", async () => {
    const run = wrapPaymentAnimation(() => makeHandle(new Promise(() => {})));

    const pending = collectTraces(async () => {
      const p = run();
      await vi.advanceTimersByTimeAsync(
        PAYMENT_WRAP.safetyTimeoutMs * 2 + PAYMENT_WRAP.betweenCyclesMs + 500
      );
      await p;
    });
    const traces = await pending;

    expect(traces.some(t => t.stage === "payment_double_cycle_completed")).toBe(
      false
    );
    expect(
      traces.find(t => t.stage === "payment_character_playback_finished")
        ?.result
    ).toBe("failed");
    expect(
      traces.filter(t => t.stage === "payment_cycle_completed")
    ).toHaveLength(0);
  });

  it("second cycle timeout yields partially_completed", async () => {
    let call = 0;
    const run = wrapPaymentAnimation(() => {
      call++;
      if (call === 1) {
        return makeHandle(Promise.resolve());
      }
      return makeHandle(new Promise(() => {}));
    });

    const pending = collectTraces(async () => {
      const p = run();
      await vi.advanceTimersByTimeAsync(
        PAYMENT_WRAP.betweenCyclesMs +
          PAYMENT_WRAP.secondCycleBeatMs +
          PAYMENT_WRAP.safetyTimeoutMs +
          100
      );
      await p;
    });
    const traces = await pending;

    expect(traces.some(t => t.stage === "payment_double_cycle_completed")).toBe(
      false
    );
    expect(
      traces.find(t => t.stage === "payment_character_playback_finished")
        ?.result
    ).toBe("partially_completed");
  });

  it("factory throw skips cycle two and reports failed", async () => {
    const run = wrapPaymentAnimation(() => {
      throw new Error("factory boom");
    });

    const traces = await collectTraces(run);

    expect(
      traces.filter(t => t.stage === "payment_cycle_started")
    ).toHaveLength(1);
    expect(traces.some(t => t.stage === "payment_double_cycle_completed")).toBe(
      false
    );
    expect(
      traces.find(t => t.stage === "payment_character_playback_finished")
        ?.result
    ).toBe("failed");
  });

  it("invalid handle skips cycle two", async () => {
    const run = wrapPaymentAnimation(
      () => ({ stop: () => {} }) as unknown as AnimationHandle
    );

    const traces = await collectTraces(run);

    expect(
      traces.filter(t => t.stage === "payment_cycle_started")
    ).toHaveLength(1);
    expect(
      traces.find(t => t.stage === "payment_character_playback_finished")
        ?.result
    ).toBe("failed");
  });

  it("rejected finished promise skips cycle two", async () => {
    const run = wrapPaymentAnimation(() =>
      makeHandle(Promise.reject(new Error("finish rejected")))
    );

    const traces = await collectTraces(run);

    expect(
      traces.filter(t => t.stage === "payment_cycle_started")
    ).toHaveLength(1);
    expect(traces.some(t => t.stage === "payment_cycle_completed")).toBe(false);
    expect(
      traces.find(t => t.stage === "payment_character_playback_finished")
        ?.result
    ).toBe("failed");
  });

  it("timeout does not emit payment_cycle_completed", async () => {
    const run = wrapPaymentAnimation(() => makeHandle(new Promise(() => {})));

    const pending = collectTraces(async () => {
      const p = run();
      await vi.advanceTimersByTimeAsync(
        PAYMENT_WRAP.safetyTimeoutMs * 2 + PAYMENT_WRAP.betweenCyclesMs + 500
      );
      await p;
    });
    const traces = await pending;

    expect(traces.some(t => t.stage === "payment_cycle_completed")).toBe(false);
    expect(
      traces.filter(t => t.stage === "payment_cycle_finished")
    ).toHaveLength(2);
  });
});
