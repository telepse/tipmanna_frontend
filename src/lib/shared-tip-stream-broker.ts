import type { Channel } from "pusher-js";
import {
  getSharedTipGuard,
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

interface TipStreamConsumer {
  eventId?: string;
  surface: RealtimeSurface;
}

const consumers = new Map<number, TipStreamConsumer>();
let nextConsumerId = 1;
let consumerRefCount = 0;
let channel: Channel | null = null;
let boundHandler: ((data: TipAnimationEvent) => void) | null = null;

/** Instrumentation counters for E4 verification specs. */
export const tipStreamBrokerMetrics = {
  producerMode: "broker" as const,
  rawReceiptCount: 0,
  guardDecisionCount: 0,
  publicationCount: 0,
  bindCount: 0,
  consumerCount: 0,
  reset(): void {
    this.rawReceiptCount = 0;
    this.guardDecisionCount = 0;
    this.publicationCount = 0;
    this.bindCount = 0;
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
  consumer: TipStreamConsumer
): boolean {
  const filter = normalizeEventFilter(consumer.eventId);
  if (filter === undefined) return true;
  return String(data.eventId).trim() === filter;
}

function hasMatchingConsumer(data: TipAnimationEvent): boolean {
  for (const consumer of consumers.values()) {
    if (eventMatchesConsumer(data, consumer)) return true;
  }
  return false;
}

function handleSharedTipAnimation(data: TipAnimationEvent): void {
  tipStreamBrokerMetrics.rawReceiptCount += 1;

  tracePaymentAnimation({
    stage: "raw_tip_animation_received",
    surface: "global_tip_stream",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    selectedTips: data.selectedTips,
    channel: GLOBAL_LIVE_TV,
    eventName: TIP_ANIMATION_EVENT,
  });

  if (!hasMatchingConsumer(data)) {
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

  logRealtimeTelemetry({
    event: "tip_animation_received",
    surface: "global_tip_stream",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    playbackEndsAt: data.playbackEndsAt,
    ageMs: Date.now() - data.serverTs,
    tabHidden: typeof document !== "undefined" ? document.hidden : undefined,
    ts: Date.now(),
  });

  const guard = getSharedTipGuard();
  tipStreamBrokerMetrics.guardDecisionCount += 1;
  const accepted = guard.shouldAccept(data);
  const age = Date.now() - data.serverTs;

  animLog("[sharedTipStreamBroker]", {
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

  tipStreamBrokerMetrics.publicationCount += 1;

  logRealtimeTelemetry({
    event: "validated_tip_dispatched",
    surface: "global_tip_stream",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    playbackEndsAt: data.playbackEndsAt,
    ageMs: age,
    ts: Date.now(),
  });

  tracePaymentAnimation({
    stage: "canonical_validated_tip_published",
    surface: "global_tip_stream",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    selectedTips: data.selectedTips,
    result: "published",
  });

  tracePaymentAnimation({
    stage: "validated_tip_dispatched",
    surface: "global_tip_stream",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    selectedTips: data.selectedTips,
    result: "dispatched",
  });

  window.dispatchEvent(new CustomEvent("validated-tip", { detail: data }));
}

function attachSharedTipStream(): void {
  if (boundHandler) return;

  channel = subscribeChannel(GLOBAL_LIVE_TV);
  if (!channel) return;

  boundHandler = handleSharedTipAnimation;
  channel.bind(TIP_ANIMATION_EVENT, boundHandler);
  tipStreamBrokerMetrics.bindCount += 1;

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

function detachSharedTipStream(): void {
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
 * Register a scoped consumer for the shared tip stream broker.
 * Multiple consumers share one Pusher bind and one guard; each accepted bundle
 * produces exactly one canonical validated-tip publication.
 */
export function registerTipStreamConsumer(options: {
  eventId?: string;
  surface: RealtimeSurface;
}): () => void {
  const id = nextConsumerId++;
  consumers.set(id, {
    eventId: options.eventId,
    surface: options.surface,
  });
  tipStreamBrokerMetrics.consumerCount = consumers.size;

  if (consumerRefCount === 0) {
    attachSharedTipStream();
  }
  consumerRefCount += 1;

  return () => {
    consumers.delete(id);
    tipStreamBrokerMetrics.consumerCount = consumers.size;
    consumerRefCount = Math.max(0, consumerRefCount - 1);
    if (consumerRefCount === 0) {
      detachSharedTipStream();
    }
  };
}

/** Test-only reset for isolated broker specs. */
export function resetSharedTipStreamBrokerForTests(): void {
  consumers.clear();
  consumerRefCount = 0;
  detachSharedTipStream();
  tipStreamBrokerMetrics.reset();
}
