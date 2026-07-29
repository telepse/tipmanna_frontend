import type { Channel } from "pusher-js";
import {
  createTipGuard,
  type TipAnimationEvent,
} from "@/lib/animation-guard";
import { animLog } from "@/lib/animationDebug";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import {
  logRealtimeTelemetry,
  type RealtimeSurface,
} from "@/lib/realtime-telemetry";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";

const GLOBAL_LIVE_TV = "global-live-tv";
const TIP_ANIMATION_EVENT = "tip-animation";

interface LegacyProducerConsumer {
  eventId?: string;
  surface: RealtimeSurface;
  guard: ReturnType<typeof createTipGuard>;
}

const consumers = new Map<number, LegacyProducerConsumer>();
let nextConsumerId = 1;
let consumerRefCount = 0;
let channel: Channel | null = null;
let boundHandler: ((data: TipAnimationEvent) => void) | null = null;

/** Instrumentation counters for E4 production-ownership verification specs. */
export const legacyTipStreamProducerMetrics = {
  producerMode: "legacy" as const,
  registrationCount: 0,
  bindCount: 0,
  guardDecisionCount: 0,
  publicationCount: 0,
  rawReceiptCount: 0,
  consumerCount: 0,
  reset(): void {
    this.registrationCount = 0;
    this.bindCount = 0;
    this.guardDecisionCount = 0;
    this.publicationCount = 0;
    this.rawReceiptCount = 0;
    this.consumerCount = 0;
  },
};

function normalizeEventFilter(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = String(raw).trim();
  return trimmed === "" ? undefined : trimmed;
}

function eventMatchesConsumer(
  data: TipAnimationEvent,
  consumer: LegacyProducerConsumer
): boolean {
  const filter = normalizeEventFilter(consumer.eventId);
  if (filter === undefined) return true;
  return String(data.eventId).trim() === filter;
}

function findMatchingConsumer(
  data: TipAnimationEvent
): LegacyProducerConsumer | undefined {
  for (const consumer of consumers.values()) {
    if (eventMatchesConsumer(data, consumer)) return consumer;
  }
  return undefined;
}

function handleLegacyTipAnimation(data: TipAnimationEvent): void {
  legacyTipStreamProducerMetrics.rawReceiptCount += 1;

  const matchingConsumer = findMatchingConsumer(data);
  if (!matchingConsumer) {
    logRealtimeTelemetry({
      event: "tip_animation_filtered",
      surface: "global_tip_stream",
      eventId: data.eventId,
      bundleId: data.id,
      reason: "no_active_consumer_for_event",
      ts: Date.now(),
    });
    tracePaymentAnimation({
      stage: "event_id_filter_rejected",
      surface: "global_tip_stream",
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      rejectionReason: "no_consumer",
      result: "rejected",
    });
    return;
  }

  const { surface } = matchingConsumer;

  tracePaymentAnimation({
    stage: "raw_tip_animation_received",
    surface,
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    selectedTips: data.selectedTips,
    channel: GLOBAL_LIVE_TV,
    eventName: TIP_ANIMATION_EVENT,
  });

  const filter = normalizeEventFilter(matchingConsumer.eventId);
  if (filter !== undefined) {
    tracePaymentAnimation({
      stage: "event_id_filter_accepted",
      surface,
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      result: "accepted",
    });
  }

  logRealtimeTelemetry({
    event: "tip_animation_received",
    surface,
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    playbackEndsAt: data.playbackEndsAt,
    ageMs: Date.now() - data.serverTs,
    tabHidden: typeof document !== "undefined" ? document.hidden : undefined,
    ts: Date.now(),
  });

  legacyTipStreamProducerMetrics.guardDecisionCount += 1;
  const accepted = matchingConsumer.guard.shouldAccept(data);
  const age = Date.now() - data.serverTs;

  animLog("[legacyTipStreamProducer]", {
    id: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    eventId: data.eventId,
    selectedTipsLen: data.selectedTips?.length,
    age,
    tabHidden: typeof document !== "undefined" ? document.hidden : undefined,
    accepted,
  });

  if (!accepted) return;

  legacyTipStreamProducerMetrics.publicationCount += 1;

  logRealtimeTelemetry({
    event: "validated_tip_dispatched",
    surface,
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    playbackEndsAt: data.playbackEndsAt,
    ageMs: age,
    ts: Date.now(),
  });

  tracePaymentAnimation({
    stage: "validated_tip_dispatched",
    surface,
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    selectedTips: data.selectedTips,
    result: "dispatched",
  });

  window.dispatchEvent(new CustomEvent("validated-tip", { detail: data }));
}

function attachLegacyTipStream(): void {
  if (boundHandler) return;

  channel = subscribeChannel(GLOBAL_LIVE_TV);
  if (!channel) return;

  boundHandler = handleLegacyTipAnimation;
  channel.bind(TIP_ANIMATION_EVENT, boundHandler);
  legacyTipStreamProducerMetrics.bindCount += 1;

  tracePaymentAnimation({
    stage: "tip_handler_bound",
    surface: "global_tip_stream",
    channel: GLOBAL_LIVE_TV,
    eventName: TIP_ANIMATION_EVENT,
    handlerBound: true,
  });

  logRealtimeTelemetry({
    event: "subscription_bind",
    surface: "global_tip_stream",
    ts: Date.now(),
  });
}

function detachLegacyTipStream(): void {
  if (!channel || !boundHandler) return;

  channel.unbind(TIP_ANIMATION_EVENT, boundHandler);
  boundHandler = null;
  channel = null;

  tracePaymentAnimation({
    stage: "tip_handler_unbound",
    surface: "global_tip_stream",
    channel: GLOBAL_LIVE_TV,
    eventName: TIP_ANIMATION_EVENT,
    handlerBound: false,
  });

  logRealtimeTelemetry({
    event: "subscription_unbind",
    surface: "global_tip_stream",
    ts: Date.now(),
  });

  unsubscribeChannel(GLOBAL_LIVE_TV);
}

/**
 * Register the page-level legacy/fallback tip stream producer.
 * One shared Pusher bind; one guard decision and one publication per accepted bundle.
 */
export function registerLegacyTipStreamProducer(options: {
  eventId?: string;
  surface: RealtimeSurface;
}): () => void {
  const id = nextConsumerId++;
  consumers.set(id, {
    eventId: options.eventId,
    surface: options.surface,
    guard: createTipGuard({ surface: options.surface }),
  });

  legacyTipStreamProducerMetrics.registrationCount += 1;
  legacyTipStreamProducerMetrics.consumerCount = consumers.size;

  if (consumerRefCount === 0) {
    attachLegacyTipStream();
  }
  consumerRefCount += 1;

  return () => {
    consumers.delete(id);
    legacyTipStreamProducerMetrics.consumerCount = consumers.size;
    consumerRefCount = Math.max(0, consumerRefCount - 1);
    if (consumerRefCount === 0) {
      detachLegacyTipStream();
    }
  };
}

/** Test-only reset for isolated ownership specs. */
export function resetLegacyTipStreamProducerForTests(): void {
  consumers.clear();
  consumerRefCount = 0;
  detachLegacyTipStream();
  legacyTipStreamProducerMetrics.reset();
}
