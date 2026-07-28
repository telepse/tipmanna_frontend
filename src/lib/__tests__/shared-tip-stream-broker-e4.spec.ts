import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import { resetSharedTipGuardForTests } from "@/lib/animation-guard";
import {
  registerTipStreamConsumer,
  resetSharedTipStreamBrokerForTests,
  tipStreamBrokerMetrics,
} from "@/lib/shared-tip-stream-broker";

let emitTipAnimation: ((data: TipAnimationEvent) => void) | null = null;
const dispatchEvents: Event[] = [];

vi.stubGlobal("window", {
  dispatchEvent: vi.fn((event: Event) => {
    dispatchEvents.push(event);
    return true;
  }),
} as unknown as Window & typeof globalThis);

vi.mock("@/lib/pusher", () => ({
  subscribeChannel: vi.fn(() => ({
    bind: vi.fn(
      (_eventName: string, handler: (data: TipAnimationEvent) => void) => {
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

describe("shared tip stream broker (Phase E4)", () => {
  beforeEach(() => {
    resetSharedTipGuardForTests();
    resetSharedTipStreamBrokerForTests();
    dispatchEvents.length = 0;
    emitTipAnimation = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetSharedTipStreamBrokerForTests();
    resetSharedTipGuardForTests();
  });

  it("one raw receipt produces one guard decision and one publication for two consumers on same event", () => {
    const unregisterRoom = registerTipStreamConsumer({
      eventId: "evt-1",
      surface: "event_room",
    });
    const unregisterScreen = registerTipStreamConsumer({
      eventId: "evt-1",
      surface: "screen_display",
    });

    emitTipAnimation?.(makeTip());

    expect(tipStreamBrokerMetrics.rawReceiptCount).toBe(1);
    expect(tipStreamBrokerMetrics.guardDecisionCount).toBe(1);
    expect(tipStreamBrokerMetrics.publicationCount).toBe(1);
    expect(tipStreamBrokerMetrics.bindCount).toBe(1);

    const validatedEvents = dispatchEvents.filter(
      event => event.type === "validated-tip"
    );
    expect(validatedEvents).toHaveLength(1);

    unregisterRoom();
    unregisterScreen();
  });

  it("duplicate seq is rejected by shared guard and does not republish", () => {
    registerTipStreamConsumer({ eventId: "evt-1", surface: "event_room" });

    emitTipAnimation?.(makeTip({ seq: 1 }));
    emitTipAnimation?.(makeTip({ seq: 1 }));

    expect(tipStreamBrokerMetrics.publicationCount).toBe(1);
    const validatedEvents = dispatchEvents.filter(
      event => event.type === "validated-tip"
    );
    expect(validatedEvents).toHaveLength(1);
  });

  it("filters bundles with no matching consumer eventId", () => {
    registerTipStreamConsumer({ eventId: "evt-1", surface: "event_room" });

    emitTipAnimation?.(makeTip({ eventId: "evt-other", seq: 2 }));

    expect(tipStreamBrokerMetrics.publicationCount).toBe(0);
    const validatedEvents = dispatchEvents.filter(
      event => event.type === "validated-tip"
    );
    expect(validatedEvents).toHaveLength(0);
  });

  it("unregisters last consumer and unbinds shared handler", async () => {
    const unregister = registerTipStreamConsumer({
      eventId: "evt-1",
      surface: "event_room",
    });
    expect(tipStreamBrokerMetrics.bindCount).toBe(1);
    unregister();
    const { unsubscribeChannel } = await import("@/lib/pusher");
    expect(unsubscribeChannel).toHaveBeenCalledWith("global-live-tv");
  });
});
