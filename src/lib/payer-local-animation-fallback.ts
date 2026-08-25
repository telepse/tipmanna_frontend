import type { RoomCharacter } from "@/types";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import { readPendingTipBroadcast } from "@/lib/payment-origin";
import { buildPaymentPlaybackKey } from "@/lib/payment-playback-key";
import { enqueuePaymentBundleForValidatedTip } from "@/lib/run-payment-bundle-animations";
import type {
  AnimationQueueTask,
  EnqueueResult,
} from "@/lib/animation-queue-core";
import type { RealtimeSurface } from "@/lib/realtime-telemetry";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import { isPayerLocalAnimationFallbackEnabled } from "@/lib/payer-local-animation-fallback-flag";

const LOCAL_FALLBACK_MARKER_PREFIX = "payer_local_fallback_played:";

function fallbackMarkerKey(transactionId: string): string {
  return `${LOCAL_FALLBACK_MARKER_PREFIX}${transactionId.trim()}`;
}

export function hasLocalFallbackPlayed(transactionId: string): boolean {
  if (typeof window === "undefined" || !transactionId.trim()) return false;
  try {
    return Boolean(localStorage.getItem(fallbackMarkerKey(transactionId)));
  } catch {
    return false;
  }
}

function markLocalFallbackPlayed(transactionId: string): void {
  if (typeof window === "undefined" || !transactionId.trim()) return;
  try {
    localStorage.setItem(fallbackMarkerKey(transactionId), String(Date.now()));
  } catch {
    /* quota / private mode */
  }
}

/**
 * One-shot local animation from saved cart when server recovery cannot claim.
 * Shares playback-key namespace with realtime/recovery via `tx:{transactionId}`.
 */
export function tryPayerLocalAnimationFallback(options: {
  eventId: string;
  transactionId: string;
  characterMap: Map<string, RoomCharacter>;
  enqueue: (tasks: AnimationQueueTask[]) => EnqueueResult;
  animationMount?: HTMLElement;
  playbackKeyPrefix?: string;
  surface: RealtimeSurface;
}): boolean {
  if (!isPayerLocalAnimationFallbackEnabled()) return false;

  const txId = options.transactionId.trim();
  const eventId = options.eventId.trim();
  if (!txId || !eventId) return false;
  if (hasLocalFallbackPlayed(txId)) return false;

  const pending = readPendingTipBroadcast();
  if (!pending?.selectedTips?.length) return false;
  if (pending.transactionId?.trim() && pending.transactionId.trim() !== txId) {
    return false;
  }
  if (pending.eventId.trim() !== eventId) return false;

  const serverTs = Date.now();
  const bundleId = `tx:${txId}`;
  const data: TipAnimationEvent = {
    id: bundleId,
    seq: 1,
    serverTs,
    playbackEndsAt: serverTs + 30_000,
    eventId,
    selectedTips: pending.selectedTips,
    amount: pending.amount,
  };

  const prefix = options.playbackKeyPrefix ?? "";
  const result = enqueuePaymentBundleForValidatedTip({
    data,
    characterMap: options.characterMap,
    buildDedupeKey: (characterName, characterIndex) =>
      buildPaymentPlaybackKey({
        prefix,
        bundleId,
        characterName,
        occurrenceIndex: characterIndex,
      }),
    enqueue: options.enqueue,
    animationMount: options.animationMount,
    surface: options.surface,
    bundleRunContext: {
      deliverySource: "payer_origin_recovery",
      bypassSegmentFreshness: true,
    },
  });

  if (!result.enqueued) return false;

  markLocalFallbackPlayed(txId);
  tracePaymentAnimation({
    stage: "payer_recovery_local_enqueue",
    transactionId: txId,
    eventId,
    bundleId,
    surface: options.surface,
    taskCount: result.runnableCount,
    deliverySource: "payer_local_fallback",
  });
  return true;
}
