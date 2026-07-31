import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ANIMATION_DURATION, PAYMENT_WRAP } from "@/lib/animationContract";
import {
  SPIN_LIFECYCLE_VERSION,
  spinStyle,
} from "@/animation-styles/spin";
import { createAnimationFromStyle } from "@/lib/factory-to-style";
import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";
import { createAnimationQueue } from "@/lib/animation-queue-core";
import { clearPlaybackKeyState } from "@/lib/playback-key-lifecycle";
import type { RoomCharacter } from "@/types";

const traceMock = vi.fn();

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: (...args: unknown[]) => traceMock(...args),
  tracePaymentAnimationError: vi.fn(),
  isPaymentAnimationTraceEnabled: () => true,
}));

vi.mock("@/lib/animationDebug", () => ({
  animLog: vi.fn(),
  animWarn: vi.fn(),
}));

const PAYMENT_TOTAL = ANIMATION_DURATION.payment.default;
const PAYMENT_MIN_LIFETIME = PAYMENT_TOTAL * 0.9;
const SAFETY_TIMEOUT_MS = PAYMENT_WRAP.safetyTimeoutMs;
const CYCLE_GAP =
  PAYMENT_WRAP.betweenCyclesMs + PAYMENT_WRAP.secondCycleBeatMs;

const SPIN_CHARACTER: Pick<RoomCharacter, "name" | "iconUrl" | "styleName"> = {
  name: "Chicken",
  iconUrl: "/icons/chicken.png",
  styleName: "Spin",
};

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
  const body: StubBody = {
    children: [],
    appendChild(child: StubElement) {
      child.parentNode = body as unknown as StubElement;
      child.isConnected = true;
      body.children.push(child);
      return child;
    },
  };

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
    icons: [SPIN_CHARACTER.iconUrl],
    mode: "payment",
  });
}

function registrySpinPayment() {
  return createAnimationFromStyle(SPIN_CHARACTER, "payment");
}

function spinTraces(): Array<{ stage: string; [k: string]: unknown }> {
  return traceMock.mock.calls.map(
    (call: unknown[]) => call[0] as { stage: string; [k: string]: unknown }
  );
}

describe("Spin payment animation lifecycle (Phase E6A v3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupDom();
    setupRaf();
    traceMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("Test A — direct natural completion", () => {
    it("schedules natural timer, resolves at TOTAL, cleans DOM once", async () => {
      const { overlays } = setupDom();
      const handle = createSpinPayment();
      flushRaf(0);

      expect(overlays()).toHaveLength(1);
      expect(
        spinTraces().some(t => t.stage === "spin_natural_timer_scheduled")
      ).toBe(true);
      expect(
        spinTraces().find(t => t.stage === "spin_natural_timer_scheduled")
          ?.delayMs
      ).toBe(PAYMENT_TOTAL);

      let settled = false;
      void handle.finished.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL - 1);
      expect(settled).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await handle.finished;

      expect(settled).toBe(true);
      expect(overlays()).toHaveLength(0);
      expect(
        spinTraces().filter(t => t.stage === "spin_finish_resolved")
      ).toHaveLength(1);
      expect(
        spinTraces().find(t => t.stage === "spin_finish_entered")?.reason
      ).toBe("natural");
      expect(PAYMENT_TOTAL).toBeLessThan(SAFETY_TIMEOUT_MS);
    });
  });

  describe("Test B — real registry path", () => {
    it("createAnimationFromStyle resolves naturally before safety timeout", async () => {
      setupDom();
      const handle = registrySpinPayment();
      flushRaf(0);

      expect(typeof handle.stop).toBe("function");
      expect(typeof handle.finished?.then).toBe("function");

      const pending = handle.finished;
      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL);
      await pending;

      expect(PAYMENT_TOTAL).toBeLessThan(SAFETY_TIMEOUT_MS);
    });
  });

  describe("Test C — real E3C wrapper path", () => {
    it("wrapPaymentAnimation with registry factory completes two cycles", async () => {
      setupDom();
      const e3cTraces: Array<{ stage: string; [k: string]: unknown }> = [];
      traceMock.mockImplementation(payload => {
        e3cTraces.push(payload as (typeof e3cTraces)[number]);
      });

      const run = wrapPaymentAnimation(
        () => registrySpinPayment(),
        {
          characterName: SPIN_CHARACTER.name,
          styleName: SPIN_CHARACTER.styleName,
          playbackKey: "bundle-1-Chicken",
        }
      );

      const pending = run();
      await vi.advanceTimersByTimeAsync(
        PAYMENT_TOTAL + CYCLE_GAP + PAYMENT_TOTAL
      );
      await pending;

      expect(e3cTraces.some(t => t.stage === "animation_safety_timeout")).toBe(
        false
      );
      expect(
        e3cTraces.filter(
          t => t.stage === "payment_cycle_finished" && t.cycleOutcome === "completed"
        )
      ).toHaveLength(2);
      expect(
        e3cTraces.find(t => t.stage === "payment_character_playback_finished")
          ?.playbackResult
      ).toBe("completed");
      expect(
        e3cTraces.some(t => t.stage === "payment_double_cycle_completed")
      ).toBe(true);
    });
  });

  describe("Test D — early stop", () => {
    it("deferred finalizer settles at min lifetime and cancels natural timer", async () => {
      const { overlays } = setupDom();
      const handle = createSpinPayment();
      flushRaf(0);

      handle.stop();

      await vi.advanceTimersByTimeAsync(PAYMENT_MIN_LIFETIME - 1);
      expect(overlays()).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(1);
      await handle.finished;

      expect(overlays()).toHaveLength(0);
      expect(
        spinTraces().find(t => t.stage === "spin_finish_entered")?.reason
      ).toBe("deferred_stop");
      expect(PAYMENT_MIN_LIFETIME).toBeLessThan(SAFETY_TIMEOUT_MS);
    });
  });

  describe("Test E — stop after minimum lifetime", () => {
    it("immediate finalization cancels natural timer", async () => {
      const { overlays } = setupDom();
      const handle = createSpinPayment();
      flushRaf(0);

      await vi.advanceTimersByTimeAsync(PAYMENT_MIN_LIFETIME);
      handle.stop();
      await handle.finished;

      expect(overlays()).toHaveLength(0);
      expect(
        spinTraces().find(t => t.stage === "spin_finish_entered")?.reason
      ).toBe("stop");
      expect(
        spinTraces().filter(t => t.stage === "spin_finish_resolved")
      ).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL);
      expect(
        spinTraces().filter(t => t.stage === "spin_finish_resolved")
      ).toHaveLength(1);
    });
  });

  describe("Test F — natural/stop race", () => {
    it("one finalizer execution and one promise resolution", async () => {
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
      expect(
        spinTraces().filter(t => t.stage === "spin_finish_resolved")
      ).toHaveLength(1);
    });
  });

  describe("Test G — simultaneous instances", () => {
    it("independent natural timers and invocation-scoped cleanup", async () => {
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

      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL - PAYMENT_MIN_LIFETIME);
      await handleB.finished;

      expect(overlays()).toHaveLength(0);
      expect(body.children).toHaveLength(0);
    });
  });

  describe("Test H — queue continuation", () => {
    it("Spin finishes naturally and queue drains without safety timeout", async () => {
      setupDom();
      clearPlaybackKeyState();

      let spinStarted = false;
      let nextStarted = false;

      const queue = createAnimationQueue({
        eventId: "evt-1",
        getEnabled: () => true,
        surface: "room_messages",
      });

      queue.enqueue([
        {
          playbackKey: "bundle-1-Chicken",
          run: wrapPaymentAnimation(() => {
            spinStarted = true;
            return createSpinPayment();
          }),
        },
        {
          playbackKey: "bundle-2-Heart",
          run: wrapPaymentAnimation(() => {
            nextStarted = true;
            return createSpinPayment();
          }),
        },
      ]);

      const oneCharacterMs = PAYMENT_TOTAL * 2 + CYCLE_GAP;
      await vi.advanceTimersByTimeAsync(oneCharacterMs * 2);
      await vi.runAllTimersAsync();

      expect(spinStarted).toBe(true);
      expect(nextStarted).toBe(true);
      expect(queue.getPendingCount()).toBe(0);
      expect(oneCharacterMs * 2).toBeLessThan(SAFETY_TIMEOUT_MS * 4);
    });
  });

  describe("Test I — production-mode branch", () => {
    it("schedules natural timer when NODE_ENV is production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      setupDom();
      traceMock.mockClear();

      const handle = createSpinPayment();
      flushRaf(0);

      expect(
        spinTraces().some(t => t.stage === "spin_natural_timer_scheduled")
      ).toBe(true);
      expect(spinTraces().every(t => t.spinLifecycleVersion === SPIN_LIFECYCLE_VERSION)).toBe(
        true
      );

      await vi.advanceTimersByTimeAsync(PAYMENT_TOTAL);
      await handle.finished;
    });
  });

  describe("Lifecycle version marker", () => {
    it("exports e6a-v3 marker constant", () => {
      expect(SPIN_LIFECYCLE_VERSION).toBe("e6a-v3");
    });
  });
});
