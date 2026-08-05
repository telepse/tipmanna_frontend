import type { RoomCharacter } from "@/types";
import type {
  TipAnimationEvent,
  ResolvedTipCharacter,
} from "@/lib/animation-guard";
import type { StyleCharacter } from "@/lib/animation-style-registry";
import { isKnownAnimationStyleName } from "@/lib/animation-style-registry";
import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";
import { createAnimationFromStyle } from "@/lib/factory-to-style";
import {
  getSegmentEndMs,
  shouldSkipPaymentSegment,
} from "@/lib/payment-playback-budget";
import { startPaymentRewardOverlays } from "@/lib/reward-overlays/mount-web-reward-layers";
import type { RealtimeSurface } from "@/lib/realtime-telemetry";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import {
  getPlaybackKeyState,
  reservePlaybackKey,
} from "@/lib/playback-key-lifecycle";
import type {
  AnimationQueueTask,
  EnqueueResult,
} from "@/lib/animation-queue-core";
import { buildPaymentPlaybackKey } from "@/lib/payment-playback-key";
import type {
  PaymentCycleOutcome,
  PaymentCharacterPlaybackResult,
} from "@/lib/payment-animation-outcomes";

export type PayerOriginRecoveryDeliverySource = "payer_origin_recovery";

export interface RecoveryOccurrencePlaybackReport {
  occurrenceId: string;
  playbackResult: "completed" | "failed";
  cycle1Outcome?: PaymentCycleOutcome;
  cycle2Outcome?: PaymentCycleOutcome;
}

function styleFromResolved(entry: ResolvedTipCharacter): StyleCharacter | null {
  if (!entry.styleName || !isKnownAnimationStyleName(entry.styleName)) {
    return null;
  }
  return {
    name: entry.name,
    iconUrl: entry.iconUrl ?? "",
    styleName: entry.styleName,
  };
}

function orderedRemainingOccurrences(
  canonicalPayload: TipAnimationEvent,
  remainingOccurrenceIds: string[]
): ResolvedTipCharacter[] {
  const idSet = new Set(remainingOccurrenceIds);
  const tips = canonicalPayload.resolvedTips ?? [];
  const withOcc = tips.filter(
    t =>
      t.occurrenceId &&
      idSet.has(t.occurrenceId) &&
      typeof t.occurrenceIndex === "number"
  );
  if (withOcc.length) {
    return [...withOcc].sort(
      (a, b) => (a.occurrenceIndex ?? 0) - (b.occurrenceIndex ?? 0)
    );
  }
  return tips.filter(t => t.occurrenceId && idSet.has(t.occurrenceId));
}

/**
 * Direct local recovery enqueue — payer-origin surface only; never broadcasts globally.
 */
export function enqueuePayerOriginRecoveryBundle(options: {
  canonicalPayload: TipAnimationEvent;
  remainingOccurrenceIds: string[];
  surface: RealtimeSurface;
  claimId: string;
  deliverySource: PayerOriginRecoveryDeliverySource;
  bypassSegmentFreshness: true;
  animationMount?: HTMLElement;
  characterMap: Map<string, RoomCharacter>;
  playbackKeyPrefix?: string;
  enqueue: (tasks: AnimationQueueTask[]) => EnqueueResult;
  onOccurrenceFinished?: (report: RecoveryOccurrencePlaybackReport) => void;
  /** Optional latency optimisation while Pusher may still arrive. */
  pusherGraceMs?: number;
}): { enqueuedCount: number; skippedRealtime: string[] } {
  const {
    canonicalPayload,
    remainingOccurrenceIds,
    surface,
    claimId,
    animationMount,
    playbackKeyPrefix = "",
    enqueue,
    onOccurrenceFinished,
  } = options;

  const data = canonicalPayload;
  const bundleId = data.id ?? `${data.eventId}-${data.serverTs}`;
  const occurrences = orderedRemainingOccurrences(data, remainingOccurrenceIds);

  startPaymentRewardOverlays(data, animationMount);

  const paymentAnimations: AnimationQueueTask[] = [];
  const skippedRealtime: string[] = [];
  const characterCount = data.selectedTips?.length ?? occurrences.length ?? 1;

  occurrences.forEach((entry, idx) => {
    const occurrenceId = entry.occurrenceId;
    if (!occurrenceId) return;

    const styleCharacter = styleFromResolved(entry);
    if (!styleCharacter) {
      tracePaymentAnimation({
        stage: "payer_recovery_occurrence_failed",
        bundleId: data.id,
        eventId: data.eventId,
        occurrenceId,
        surface,
        claimId,
        result: "invalid_style",
      });
      onOccurrenceFinished?.({
        occurrenceId,
        playbackResult: "failed",
        cycle1Outcome: "factory_failed",
      });
      return;
    }

    const key = buildPaymentPlaybackKey({
      prefix: playbackKeyPrefix,
      bundleId,
      characterName: entry.name,
      occurrenceIndex: entry.occurrenceIndex,
    });

    const traceMeta = {
      surface,
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      characterName: entry.name,
      styleName: styleCharacter.styleName,
    };

    const existingState = getPlaybackKeyState(key);
    if (existingState !== "unseen") {
      tracePaymentAnimation({
        stage: "payer_recovery_realtime_won",
        ...traceMeta,
        playbackKey: key,
        occurrenceId,
        claimId,
        previousState: existingState,
        result: "skipped",
      });
      skippedRealtime.push(occurrenceId);
      if (existingState === "committed") {
        onOccurrenceFinished?.({
          occurrenceId,
          playbackResult: "completed",
          cycle1Outcome: "completed",
          cycle2Outcome: "completed",
        });
      }
      return;
    }

    if (!reservePlaybackKey(key, traceMeta)) {
      return;
    }

    const traceContext = {
      ...traceMeta,
      playbackKey: key,
      onCharacterPlaybackFinished: (result: {
        playbackResult: PaymentCharacterPlaybackResult;
        cycle1Outcome: PaymentCycleOutcome;
        cycle2Outcome: PaymentCycleOutcome | null;
      }) => {
        const playbackResult =
          result.playbackResult === "completed" ? "completed" : "failed";
        if (playbackResult === "completed") {
          tracePaymentAnimation({
            stage: "payer_recovery_occurrence_completed",
            ...traceMeta,
            playbackKey: key,
            occurrenceId,
            claimId,
            cycle1Outcome: result.cycle1Outcome,
            cycle2Outcome: result.cycle2Outcome ?? undefined,
          });
        } else {
          tracePaymentAnimation({
            stage: "payer_recovery_occurrence_failed",
            ...traceMeta,
            playbackKey: key,
            occurrenceId,
            claimId,
            cycle1Outcome: result.cycle1Outcome,
            cycle2Outcome: result.cycle2Outcome ?? undefined,
          });
        }
        onOccurrenceFinished?.({
          occurrenceId,
          playbackResult,
          cycle1Outcome: result.cycle1Outcome,
          cycle2Outcome: result.cycle2Outcome ?? undefined,
        });
      },
    };

    const characterIndex =
      typeof entry.occurrenceIndex === "number" ? entry.occurrenceIndex : idx;

    const segmentEnd = getSegmentEndMs(
      data.serverTs,
      data.playbackEndsAt,
      characterIndex,
      characterCount
    );

    const skipSegment =
      !options.bypassSegmentFreshness &&
      shouldSkipPaymentSegment(Date.now(), segmentEnd);

    if (skipSegment) {
      paymentAnimations.push({
        playbackKey: key,
        traceMeta,
        run: async () => {
          tracePaymentAnimation({
            stage: "payment_segment_budget_skipped",
            ...traceMeta,
            playbackKey: key,
            result: "skipped",
          });
        },
      });
    } else {
      tracePaymentAnimation({
        stage: "payer_recovery_occurrence_started",
        ...traceMeta,
        playbackKey: key,
        occurrenceId,
        claimId,
      });

      paymentAnimations.push({
        playbackKey: key,
        traceMeta,
        run: wrapPaymentAnimation(
          () =>
            createAnimationFromStyle(styleCharacter, "payment", animationMount),
          traceContext
        ),
      });
    }

    tracePaymentAnimation({
      stage: "payer_recovery_local_enqueue",
      ...traceMeta,
      playbackKey: key,
      occurrenceId,
      claimId,
      deliverySource: options.deliverySource,
    });
  });

  if (paymentAnimations.length > 0) {
    tracePaymentAnimation({
      stage: "playback_task_offered_to_queue",
      surface,
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      taskCount: paymentAnimations.length,
      claimId,
    });
    enqueue(paymentAnimations);
  }

  return { enqueuedCount: paymentAnimations.length, skippedRealtime };
}
