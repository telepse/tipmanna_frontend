import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import { resetSharedTipGuardForTests } from "@/lib/animation-guard";
import {
  registerTipStreamConsumer,
  resetSharedTipStreamBrokerForTests,
  tipStreamBrokerMetrics,
} from "@/lib/shared-tip-stream-broker";
import {
  legacyTipStreamProducerMetrics,
  registerLegacyTipStreamProducer,
  resetLegacyTipStreamProducerForTests,
} from "@/lib/legacy-tip-stream-producer";
import { isSingleTipStreamBrokerEnabled } from "@/lib/single-tip-stream-broker-flag";

let emitTipAnimation: ((data: TipAnimationEvent) => void) | null = null;
let pusherBindCount = 0;
const dispatchEvents: Event[] = [];
const roomListenerInvocations: TipAnimationEvent[] = [];
const screenListenerInvocations: TipAnimationEvent[] = [];
const validatedTipHandlers = new Set<EventListener>();

vi.stubGlobal("window", {
  dispatchEvent: vi.fn((event: Event) => {
    dispatchEvents.push(event);
    for (const handler of validatedTipHandlers) {
      handler(event);
    }
    return true;
  }),
  addEventListener: vi.fn((type: string, handler: EventListener) => {
    if (type === "validated-tip") validatedTipHandlers.add(handler);
  }),
  removeEventListener: vi.fn((type: string, handler: EventListener) => {
    if (type === "validated-tip") validatedTipHandlers.delete(handler);
  }),
} as unknown as Window & typeof globalThis);

vi.mock("@/lib/pusher", () => ({
  subscribeChannel: vi.fn(() => ({
    bind: vi.fn(
      (_eventName: string, handler: (data: TipAnimationEvent) => void) => {
        pusherBindCount += 1;
        emitTipAnimation = handler;
      }
    ),
    unbind: vi.fn(() => {
      emitTipAnimation = null;
    }),
  })),
  unsubscribeChannel: vi.fn(),
}));

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

function makeTip(
  overrides: Partial<TipAnimationEvent> = {}
): TipAnimationEvent {
  return {
    id: "bundle-1",
    seq: 1,
    serverTs: Date.now(),
    eventId: "evt-1",
    selectedTips: ["Heart"],
    ...overrides,
  };
}

function resetEnv(): void {
  vi.unstubAllEnvs();
}

function setProductionEnv(flag: string | undefined): void {
  vi.stubEnv("NODE_ENV", "production");
  if (flag === undefined) {
    vi.stubEnv("NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER", "");
    delete process.env.NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER;
  } else {
    vi.stubEnv("NEXT_PUBLIC_SINGLE_TIP_STREAM_BROKER", flag);
  }
}

/** Mirrors GlobalTipStreamProvider ownership decision. */
function registerEventRoomProducer(eventId: string): () => void {
  if (isSingleTipStreamBrokerEnabled()) {
    return registerTipStreamConsumer({ eventId, surface: "event_room" });
  }
  return registerLegacyTipStreamProducer({ eventId, surface: "event_room" });
}

function addRoomConsumer(eventId: string, enabled = true): () => void {
  const handler = (e: Event) => {
    if (!enabled) return;
    const data = (e as CustomEvent<TipAnimationEvent>).detail;
    if (data.eventId === eventId) roomListenerInvocations.push(data);
  };
  window.addEventListener("validated-tip", handler);
  return () => window.removeEventListener("validated-tip", handler);
}

function addScreenConsumer(eventId: string, screenOpen: boolean): () => void {
  const handler = (e: Event) => {
    if (!screenOpen) return;
    const data = (e as CustomEvent<TipAnimationEvent>).detail;
    if (data.eventId === eventId) screenListenerInvocations.push(data);
  };
  window.addEventListener("validated-tip", handler);
  return () => window.removeEventListener("validated-tip", handler);
}

function validatedTipEvents(): TipAnimationEvent[] {
  return dispatchEvents
    .filter(event => event.type === "validated-tip")
    .map(event => (event as CustomEvent<TipAnimationEvent>).detail);
}

function activeProducerMode(): "broker" | "legacy" | "none" {
  if (tipStreamBrokerMetrics.bindCount > 0) return "broker";
  if (legacyTipStreamProducerMetrics.bindCount > 0) return "legacy";
  return "none";
}

describe("E4 production stream ownership correction", () => {
  beforeEach(() => {
    resetSharedTipGuardForTests();
    resetSharedTipStreamBrokerForTests();
    resetLegacyTipStreamProducerForTests();
    resetEnv();
    dispatchEvents.length = 0;
    roomListenerInvocations.length = 0;
    screenListenerInvocations.length = 0;
    validatedTipHandlers.clear();
    emitTipAnimation = null;
    pusherBindCount = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetSharedTipStreamBrokerForTests();
    resetLegacyTipStreamProducerForTests();
    resetSharedTipGuardForTests();
    resetEnv();
  });

  describe("flag semantics", () => {
    it("unset in production enables broker (Test A prerequisite)", () => {
      setProductionEnv(undefined);
      expect(isSingleTipStreamBrokerEnabled()).toBe(true);
    });

    it("explicit true enables broker (Test B prerequisite)", () => {
      setProductionEnv("true");
      expect(isSingleTipStreamBrokerEnabled()).toBe(true);
    });

    it("explicit false enables legacy fallback (Test C prerequisite)", () => {
      setProductionEnv("false");
      expect(isSingleTipStreamBrokerEnabled()).toBe(false);
    });
  });

  describe("Test A — production, flag unset", () => {
    it("registers exactly one broker producer and publishes one validated-tip", () => {
      setProductionEnv(undefined);
      const unregister = registerEventRoomProducer("evt-1");
      addRoomConsumer("evt-1");

      emitTipAnimation?.(makeTip());

      expect(activeProducerMode()).toBe("broker");
      expect(pusherBindCount).toBe(1);
      expect(tipStreamBrokerMetrics.bindCount).toBe(1);
      expect(legacyTipStreamProducerMetrics.bindCount).toBe(0);
      expect(tipStreamBrokerMetrics.publicationCount).toBe(1);
      expect(validatedTipEvents()).toHaveLength(1);
      expect(roomListenerInvocations).toHaveLength(1);

      unregister();
    });
  });

  describe("Test B — explicit broker true", () => {
    it("uses one broker registration, one handler, one guard, one publication", () => {
      setProductionEnv("true");
      const unregister = registerEventRoomProducer("evt-1");

      emitTipAnimation?.(makeTip());

      expect(tipStreamBrokerMetrics.bindCount).toBe(1);
      expect(tipStreamBrokerMetrics.rawReceiptCount).toBe(1);
      expect(tipStreamBrokerMetrics.guardDecisionCount).toBe(1);
      expect(tipStreamBrokerMetrics.publicationCount).toBe(1);
      expect(tipStreamBrokerMetrics.consumerCount).toBe(1);
      expect(legacyTipStreamProducerMetrics.registrationCount).toBe(0);
      expect(validatedTipEvents()).toHaveLength(1);

      unregister();
    });
  });

  describe("Test C — explicit broker false", () => {
    it("uses one legacy producer with no broker registration", () => {
      setProductionEnv("false");
      const unregister = registerEventRoomProducer("evt-1");
      addRoomConsumer("evt-1");

      emitTipAnimation?.(makeTip());

      expect(activeProducerMode()).toBe("legacy");
      expect(pusherBindCount).toBe(1);
      expect(legacyTipStreamProducerMetrics.bindCount).toBe(1);
      expect(legacyTipStreamProducerMetrics.registrationCount).toBe(1);
      expect(legacyTipStreamProducerMetrics.publicationCount).toBe(1);
      expect(tipStreamBrokerMetrics.bindCount).toBe(0);
      expect(tipStreamBrokerMetrics.publicationCount).toBe(0);
      expect(roomListenerInvocations).toHaveLength(1);

      unregister();
    });
  });

  describe("Test D — Event Room plus Screen Display", () => {
    it.each([
      ["unset", undefined],
      ["true", "true"],
      ["false", "false"],
    ])(
      "flag=%s: one raw producer and one publication fan out to room and screen",
      (_label, flag) => {
        setProductionEnv(flag);
        const unregisterProducer = registerEventRoomProducer("evt-1");
        const unregisterRoom = addRoomConsumer("evt-1");
        const unregisterScreen = addScreenConsumer("evt-1", true);

        emitTipAnimation?.(makeTip({ seq: 10 }));

        expect(pusherBindCount).toBe(1);
        expect(validatedTipEvents()).toHaveLength(1);
        expect(roomListenerInvocations).toHaveLength(1);
        expect(screenListenerInvocations).toHaveLength(1);

        unregisterScreen();
        unregisterRoom();
        unregisterProducer();
      }
    );
  });

  describe("Test E — Screen closed", () => {
    it("keeps one producer; room receives; screen does not", () => {
      setProductionEnv(undefined);
      const unregisterProducer = registerEventRoomProducer("evt-1");
      const unregisterRoom = addRoomConsumer("evt-1");
      const unregisterScreen = addScreenConsumer("evt-1", false);

      emitTipAnimation?.(makeTip({ seq: 20 }));

      expect(pusherBindCount).toBe(1);
      expect(roomListenerInvocations).toHaveLength(1);
      expect(screenListenerInvocations).toHaveLength(0);

      unregisterScreen();
      unregisterRoom();
      unregisterProducer();
      expect(pusherBindCount).toBe(1);
    });
  });

  describe("Test F — Screen reopen", () => {
    it("does not replay closed-period events; first new event reaches both surfaces", () => {
      setProductionEnv(undefined);
      const unregisterProducer = registerEventRoomProducer("evt-1");
      const unregisterRoom = addRoomConsumer("evt-1");
      let screenOpen = false;
      const screenHandler = (e: Event) => {
        if (!screenOpen) return;
        const data = (e as CustomEvent<TipAnimationEvent>).detail;
        if (data.eventId === "evt-1") screenListenerInvocations.push(data);
      };
      window.addEventListener("validated-tip", screenHandler);

      emitTipAnimation?.(makeTip({ seq: 30 }));
      expect(roomListenerInvocations).toHaveLength(1);
      expect(screenListenerInvocations).toHaveLength(0);

      screenOpen = true;
      emitTipAnimation?.(makeTip({ seq: 31 }));

      expect(roomListenerInvocations).toHaveLength(2);
      expect(screenListenerInvocations).toHaveLength(1);
      expect(screenListenerInvocations[0]?.seq).toBe(31);
      expect(pusherBindCount).toBe(1);

      window.removeEventListener("validated-tip", screenHandler);
      unregisterRoom();
      unregisterProducer();
    });
  });

  describe("Test G — Provider remount", () => {
    it("unbinds old handler and binds exactly once after remount", () => {
      setProductionEnv(undefined);
      const first = registerEventRoomProducer("evt-1");
      expect(pusherBindCount).toBe(1);
      expect(emitTipAnimation).not.toBeNull();
      first();
      expect(emitTipAnimation).toBeNull();

      const second = registerEventRoomProducer("evt-1");
      expect(pusherBindCount).toBe(2);
      expect(emitTipAnimation).not.toBeNull();
      second();
    });

    it("legacy path remount keeps one active handler", () => {
      setProductionEnv("false");
      const first = registerEventRoomProducer("evt-1");
      expect(pusherBindCount).toBe(1);
      first();
      expect(emitTipAnimation).toBeNull();

      const second = registerEventRoomProducer("evt-1");
      expect(pusherBindCount).toBe(2);
      expect(emitTipAnimation).not.toBeNull();
      second();
    });
  });

  describe("Test H — reconnect simulation", () => {
    it("detach and reattach does not accumulate active handlers", () => {
      setProductionEnv(undefined);
      const unregister = registerEventRoomProducer("evt-1");
      expect(emitTipAnimation).not.toBeNull();

      unregister();
      expect(emitTipAnimation).toBeNull();

      const reRegister = registerEventRoomProducer("evt-1");
      expect(emitTipAnimation).not.toBeNull();
      expect(pusherBindCount).toBe(2);

      emitTipAnimation?.(makeTip({ seq: 40 }));
      expect(tipStreamBrokerMetrics.publicationCount).toBe(1);

      reRegister();
    });
  });

  describe("Test I — Explore/TV/Content regression", () => {
    it("direct broker hook registration works without provider", () => {
      setProductionEnv(undefined);
      const unregister = registerTipStreamConsumer({
        eventId: "evt-explore",
        surface: "explore_feed",
      });

      emitTipAnimation?.(makeTip({ eventId: "evt-explore", seq: 50 }));

      expect(tipStreamBrokerMetrics.bindCount).toBe(1);
      expect(tipStreamBrokerMetrics.publicationCount).toBe(1);

      unregister();
    });

    it("provider plus nested hook would double-bind without guard — broker shares one bind for two consumers", () => {
      setProductionEnv(undefined);
      const unregisterProvider = registerEventRoomProducer("evt-1");
      const unregisterExplore = registerTipStreamConsumer({
        eventId: "evt-1",
        surface: "explore_feed",
      });

      emitTipAnimation?.(makeTip({ seq: 51 }));

      expect(pusherBindCount).toBe(1);
      expect(tipStreamBrokerMetrics.publicationCount).toBe(1);
      expect(tipStreamBrokerMetrics.consumerCount).toBe(2);

      unregisterExplore();
      unregisterProvider();
    });

    it("flag false keeps legacy producer active for Event Room while broker stays off", () => {
      setProductionEnv("false");
      const unregister = registerEventRoomProducer("evt-1");

      emitTipAnimation?.(makeTip({ seq: 52 }));

      expect(legacyTipStreamProducerMetrics.publicationCount).toBe(1);
      expect(tipStreamBrokerMetrics.publicationCount).toBe(0);

      unregister();
    });
  });

  describe("Test J — broker never runs alongside legacy producer module", () => {
    it("broker mode does not register legacy producer", () => {
      setProductionEnv("true");
      registerEventRoomProducer("evt-1")();
      expect(legacyTipStreamProducerMetrics.bindCount).toBe(0);
      expect(tipStreamBrokerMetrics.bindCount).toBe(1);
    });

    it("legacy mode does not register broker producer", () => {
      setProductionEnv("false");
      registerEventRoomProducer("evt-1")();
      expect(tipStreamBrokerMetrics.bindCount).toBe(0);
      expect(legacyTipStreamProducerMetrics.bindCount).toBe(1);
    });
  });
});
