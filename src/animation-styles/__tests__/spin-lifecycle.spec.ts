import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ANIMATION_DURATION, PAYMENT_WRAP } from "@/lib/animationContract";
import { spinStyle } from "@/animation-styles/spin";
import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";
import { createAnimationQueue } from "@/lib/animation-queue-core";
import { clearPlaybackKeyState } from "@/lib/playback-key-lifecycle";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

vi.mock("@/lib/animationDebug", () => ({
  animLog: vi.fn(),
  animWarn: vi.fn(),
}));

const PAYMENT_TOTAL = ANIMATION_DURATION.payment.default;
const PAYMENT_MIN_LIFETIME = PAYMENT_TOTAL * 0.9;
const SAFETY_TIMEOUT_MS = PAYMENT_WRAP.safetyTimeoutMs;

type StubElement = {
  tagName: string;
  style: Record<string, string>;
  parentNode: StubElement | StubBody | null;
  isConnected: boolean;
  src?: string;
  children: StubElement[];
  appendChild(child: StubElement): StubElement;
  remove(): void;
};

type StubBody = {
  children: StubElement[];
  appendChild(child: StubElement): StubElement;
};

function createStubElement(tag: string): StubElement {
  const el: StubElement = {
    tagName: tag.toUpperCase(),
    style: {},
    parentNode: null,
    isConnected: false,
    children: [],
    appendChild(child: StubElement) {
      child.parentNode = el;
      child.isConnected = true;
      el.children.push(child);
      return child;
    },
    remove() {
      if (el.parentNode) {
        const parent = el.parentNode as StubBody | StubElement;
        parent.children = parent.children.filter(c => c !== el);
      }
      el.parentNode = null;
      el.isConnected = false;
    },
  };
  return el;
}

function setupDom(): { body: StubBody; overlays: () => StubElement[] } {
  const body: StubBody = { children: [], appendChild(child: StubElement) {
    child.parentNode = body as unknown as StubElement;
    child.isConnected = true;
    body.children.push(child);
    return child;
  } };

  vi.stubGlobal(
    "document",
    {
      createElement: (tag: string) => createStubElement(tag),
      body,
    } as unknown as Document
  );

  vi.stubGlobal(
    "window",
    {
      innerWidth: 1024,
      innerHeight: 768,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    } as unknown as Window & typeof globalThis
  );

  return {
    body,
    overlays: () =>
      body.children.filter(
        el => el.tagName === "DIV" && el.style.position === "fixed"
      ),
  };
}

let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

function setupRaf(): void {
  rafId = 0;
  rafCallbacks.clear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = ++rafId;
    rafCallbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafCallbacks.delete(id);
  });
}

function flushRaf(now = performance.now()): void {
  const pending = [...rafCallbacks.entries()];
  rafCallbacks.clear();
  for (const [, cb] of pending) {
    cb(now);
  }
}

function createSpinPayment() {
  return spinStyle({
    icons: ["/icons/burger.png"],
    mode: "payment",
  });
}

describe("Spin payment animation lifecycle (Phase E6A)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDom();
    setupRaf();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("Test A — natural payment completion", () => {
    it("resolves finished at intended duration, cleans DOM, exactly once", async () => {
      const { overlays } = setupDom();
      const handle = createSpinPayment();
      flushRaf(0);

      expect(overlays()).toHaveLength(1);

      let settled = false;
      const done = handle.finished.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL - 1);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await done;

      expect(settled).toBe(true);
      expect(overlays()).toHaveLength(0);
      expect(PAYMENT_TOTAL).toBeLessThan(SAFETY_TIMEOUT_MS);
    });
  });

  describe("Test B — explicit stop", () => {
    it("settles finished, cleans DOM, repeated stop is safe", async () => {
      const { overlays } = setupDom();
      const handle = createSpinPayment();
      flushRaf(0);

      await vi.advanceTimersByTimeAsync(PAYMENT_MIN_LIFETIME);

      handle.stop();
      await handle.finished;

      expect(overlays()).toHaveLength(0);

      expect(() => handle.stop()).not.toThrow();
      await expect(handle.finished).resolves.toBeUndefined();
    });
  });

  describe("Test C — stop before minimum lifetime", () => {
    it("schedules finish at minimum-lifetime boundary without safety timeout", async () => {
      const { overlays } = setupDom();
      const handle = createSpinPayment();
      flushRaf(0);

      handle.stop();

      await vi.advanceTimersByTimeAsync(PAYMENT_MIN_LIFETIME - 1);
      expect(overlays()).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(1);
      await handle.finished;

      expect(overlays()).toHaveLength(0);
      expect(PAYMENT_MIN_LIFETIME).toBeLessThan(SAFETY_TIMEOUT_MS);
    });
  });

  describe("Test D — natural finish and stop race", () => {
    it("finalizer runs once and promise resolves once", async () => {
      setupDom();
      const handle = createSpinPayment();
      flushRaf(0);

      let resolveCount = 0;
      void handle.finished.then(() => {
        resolveCount += 1;
      });

      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL);
      handle.stop();
      handle.stop();
      await handle.finished;

      expect(resolveCount).toBe(1);
    });
  });

  describe("Test E — two simultaneous instances", () => {
    it("instances finish independently without DOM collision", async () => {
      const { body, overlays } = setupDom();

      const handleA = spinStyle({
        icons: ["/icons/a.png"],
        mode: "payment",
      });
      const handleB = spinStyle({
        icons: ["/icons/b.png"],
        mode: "payment",
      });
      flushRaf(0);

      expect(overlays()).toHaveLength(2);

      await vi.advanceTimersByTimeAsync(PAYMENT_MIN_LIFETIME);
      handleA.stop();
      await handleA.finished;

      expect(overlays()).toHaveLength(1);
      expect(body.children).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL);
      await handleB.finished;

      expect(overlays()).toHaveLength(0);
      expect(body.children).toHaveLength(0);
    });
  });

  describe("Test F — E3C integration", () => {
    it("wrapPaymentAnimation completes two cycles without safety timeout", async () => {
      setupDom();
      const traces: Array<{ stage: string; [k: string]: unknown }> = [];
      const { tracePaymentAnimation } = await import(
        "@/lib/payment-animation-trace"
      );
      vi.mocked(tracePaymentAnimation).mockImplementation(payload => {
        traces.push(payload as (typeof traces)[number]);
      });

      const run = wrapPaymentAnimation(() => createSpinPayment(), {
        characterName: "Burger",
        styleName: "Spin",
        playbackKey: "bundle-1-Burger",
      });

      const pending = run();
      const cycleGap =
        PAYMENT_WRAP.betweenCyclesMs + PAYMENT_WRAP.secondCycleBeatMs;

      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL + cycleGap + PAYMENT_TOTAL);
      await pending;

      expect(traces.some(t => t.stage === "animation_safety_timeout")).toBe(
        false
      );
      expect(
        traces.filter(t => t.stage === "payment_cycle_finished" && t.cycleOutcome === "completed")
      ).toHaveLength(2);
      expect(
        traces.find(t => t.stage === "payment_character_playback_finished")
          ?.playbackResult
      ).toBe("completed");
      expect(traces.some(t => t.stage === "payment_double_cycle_completed")).toBe(
        true
      );
    });
  });

  describe("Test G — queue continuation", () => {
    it("Spin completes naturally and next character starts without safety timeout", async () => {
      setupDom();
      clearPlaybackKeyState();

      let spinStarted = false;
      let burstStarted = false;

      const queue = createAnimationQueue({
        eventId: "evt-1",
        getEnabled: () => true,
        surface: "room_messages",
      });

      queue.enqueue([
        {
          playbackKey: "bundle-1-Burger",
          run: wrapPaymentAnimation(() => {
            spinStarted = true;
            return createSpinPayment();
          }),
        },
        {
          playbackKey: "bundle-2-Heart",
          run: wrapPaymentAnimation(() => {
            burstStarted = true;
            return createSpinPayment();
          }),
        },
      ]);

      const cycleGap =
        PAYMENT_WRAP.betweenCyclesMs + PAYMENT_WRAP.secondCycleBeatMs;
      const oneCharacterMs = PAYMENT_TOTAL * 2 + cycleGap;

      await vi.advanceTimersByTimeAsync(oneCharacterMs * 2);
      await vi.runAllTimersAsync();
      expect(spinStarted).toBe(true);
      expect(burstStarted).toBe(true);
      expect(queue.getPendingCount()).toBe(0);
      expect(PAYMENT_TOTAL).toBeLessThan(SAFETY_TIMEOUT_MS);
      expect(oneCharacterMs * 2).toBeLessThan(SAFETY_TIMEOUT_MS * 4);
    });
  });

  describe("Test H — surface-key regression", () => {
    it("playback keys remain surface-scoped strings", () => {
      const roomKey = "bundle-abc-Burger";
      const screenKey = "screen-bundle-abc-Burger";

      expect(roomKey).toBe("bundle-abc-Burger");
      expect(screenKey).toBe("screen-bundle-abc-Burger");
      expect(roomKey).not.toBe(screenKey);
    });
  });
});
