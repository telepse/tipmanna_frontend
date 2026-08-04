import type { RoomCharacter } from "@/types";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";
import { createAnimationFromStyle } from "@/lib/factory-to-style";
import { resolvePaymentCharactersForTip } from "@/lib/tip-animation-characters";
import {
  getSegmentEndMs,
  shouldSkipPaymentSegment,
} from "@/lib/payment-playback-budget";
import { startPaymentRewardOverlays } from "@/lib/reward-overlays/mount-web-reward-layers";
import {
  logRealtimeTelemetry,
  type RealtimeSurface,
} from "@/lib/realtime-telemetry";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import {
  getPlaybackKeyState,
  reservePlaybackKey,
} from "@/lib/playback-key-lifecycle";
import type {
  AnimationQueueTask,
  EnqueueResult,
} from "@/lib/animation-queue-core";
import {
  preflightPaymentCharacterStyles,
  type PaymentCharacterStyleRejection,
} from "@/lib/payment-style-preflight";
import type { PaymentBundleResolutionSummary } from "@/lib/payment-character-resolution";

export interface PaymentBundleEnqueueResult {
  runnableCount: number;
  rejectedCount: number;
  rejections: PaymentCharacterStyleRejection[];
  enqueued: boolean;
  enqueueResult?: EnqueueResult;
  resolutionSummary?: PaymentBundleResolutionSummary;
}

export type PaymentBundleDeliverySource = "realtime" | "payer_origin_recovery";

export interface PaymentBundleRunContext {
  deliverySource?: PaymentBundleDeliverySource;
  bypassSegmentFreshness?: boolean;
}

/**
 * Shared payment path: Turbo/Galaxy companions for the bundle window, then
 * sequential character animations (unchanged).
 */
export function enqueuePaymentBundleForValidatedTip(options: {
  data: TipAnimationEvent;
  characterMap: Map<string, RoomCharacter>;
  /** Per-surface dedupe key; optional characterIndex for occurrence-aware keys. */
  buildDedupeKey: (characterName: string, characterIndex?: number) => string;
  enqueue: (tasks: AnimationQueueTask[]) => EnqueueResult;
  animationMount?: HTMLElement;
  surface?: RealtimeSurface;
  bundleRunContext?: PaymentBundleRunContext;
}): PaymentBundleEnqueueResult {
  const {
    data,
    characterMap,
    buildDedupeKey,
    enqueue,
    animationMount,
    surface = "unknown",
    bundleRunContext,
  } = options;

  const bypassSegmentFreshness =
    bundleRunContext?.deliverySource === "payer_origin_recovery" &&
    bundleRunContext?.bypassSegmentFreshness === true;

  const emptyResult = (
    rejections: PaymentCharacterStyleRejection[] = [],
    resolutionSummary?: PaymentBundleResolutionSummary
  ): PaymentBundleEnqueueResult => ({
    runnableCount: 0,
    rejectedCount: rejections.length,
    rejections,
    enqueued: false,
    resolutionSummary,
  });

  const { characters: selectedCharacters, summary: resolutionSummary } =
    resolvePaymentCharactersForTip(data, characterMap);
  if (!selectedCharacters.length) {
    return emptyResult([], resolutionSummary);
  }

  const { accepted: runnableCharacters, rejections } =
    preflightPaymentCharacterStyles(selectedCharacters, {
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      surface,
      buildPlaybackKey: buildDedupeKey,
    });

  const runnableNames = new Set(runnableCharacters.map(c => c.name));

  resolutionSummary.rejectedCount = rejections.length;
  resolutionSummary.runnableCount = runnableCharacters.length;

  if (!runnableCharacters.length) {
    return emptyResult(rejections, resolutionSummary);
  }

  logRealtimeTelemetry({
    event: "bundle_enqueue",
    surface,
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    playbackEndsAt: data.playbackEndsAt,
    characterCount: runnableCharacters.length,
    rewardTurbo: data.rewardTurbo,
    rewardGalaxy: data.rewardGalaxy,
    ts: Date.now(),
  });

  startPaymentRewardOverlays(data, animationMount);

  const paymentAnimations: AnimationQueueTask[] = [];
  const characterCount =
    resolutionSummary.expectedCount ||
    (data.selectedTips?.length ?? selectedCharacters.length);

  selectedCharacters.forEach((character, characterIndex) => {
    if (!runnableNames.has(character.name)) {
      return;
    }

    const key = buildDedupeKey(character.name, characterIndex);
    const traceMeta = {
      surface,
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      characterName: character.name,
      styleName: character.styleName,
    };

    const existingState = getPlaybackKeyState(key);
    if (existingState !== "unseen") {
      tracePaymentAnimation({
        stage:
          existingState === "committed"
            ? "playback_key_duplicate_committed"
            : "playback_key_duplicate_reserved",
        ...traceMeta,
        playbackKey: key,
        previousState: existingState,
        resultingState: existingState,
        result: "skipped",
      });
      return;
    }

    if (!reservePlaybackKey(key, traceMeta)) {
      return;
    }

    const traceContext = {
      ...traceMeta,
      playbackKey: key,
    };

    const segmentEnd = getSegmentEndMs(
      data.serverTs,
      data.playbackEndsAt,
      characterIndex,
      characterCount
    );

    if (
      !bypassSegmentFreshness &&
      shouldSkipPaymentSegment(Date.now(), segmentEnd)
    ) {
      tracePaymentAnimation({
        stage: "payment_segment_budget_skipped",
        ...traceMeta,
        playbackKey: key,
        cycleOutcome: "noop_or_skipped",
        result: "skipped",
      });

      paymentAnimations.push({
        playbackKey: key,
        traceMeta,
        run: async () => {
          tracePaymentAnimation({
            stage: "payment_character_playback_finished",
            ...traceMeta,
            playbackKey: key,
            cycle1Outcome: "noop_or_skipped",
            playbackResult: "skipped",
            result: "skipped",
          });
        },
      });
    } else {
      paymentAnimations.push({
        playbackKey: key,
        traceMeta,
        run: wrapPaymentAnimation(
          () => createAnimationFromStyle(character, "payment", animationMount),
          traceContext
        ),
      });
    }

    tracePaymentAnimation({
      stage: "playback_task_created",
      ...traceMeta,
      playbackKey: key,
    });
  });

  if (paymentAnimations.length === 0) {
    return {
      runnableCount: 0,
      rejectedCount: rejections.length,
      rejections,
      enqueued: false,
      resolutionSummary,
    };
  }

  tracePaymentAnimation({
    stage: "playback_task_offered_to_queue",
    surface,
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    taskCount: paymentAnimations.length,
  });

  const enqueueResult = enqueue(paymentAnimations);
  return {
    runnableCount: paymentAnimations.length,
    rejectedCount: rejections.length,
    rejections,
    enqueued: enqueueResult.accepted,
    enqueueResult,
    resolutionSummary,
  };
}
