import type { RoomCharacter } from "@/types";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";
import { createAnimationFromStyle } from "@/lib/factory-to-style";
import { resolveStyleCharactersForTip } from "@/lib/tip-animation-characters";
import {
  getSegmentEndMs,
  noopPaymentAnimationHandle,
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

export interface PaymentBundleEnqueueResult {
  runnableCount: number;
  rejectedCount: number;
  rejections: PaymentCharacterStyleRejection[];
  enqueued: boolean;
  enqueueResult?: EnqueueResult;
}

/**
 * Shared payment path: Turbo/Galaxy companions for the bundle window, then
 * sequential character animations (unchanged).
 */
export function enqueuePaymentBundleForValidatedTip(options: {
  data: TipAnimationEvent;
  characterMap: Map<string, RoomCharacter>;
  /** Per-surface dedupe key, e.g. `${dedupeBase}-${name}` or `screen-${dedupeBase}-${name}`. */
  buildDedupeKey: (characterName: string) => string;
  enqueue: (tasks: AnimationQueueTask[]) => EnqueueResult;
  animationMount?: HTMLElement;
  surface?: RealtimeSurface;
}): PaymentBundleEnqueueResult {
  const {
    data,
    characterMap,
    buildDedupeKey,
    enqueue,
    animationMount,
    surface = "unknown",
  } = options;

  const emptyResult = (
    rejections: PaymentCharacterStyleRejection[] = []
  ): PaymentBundleEnqueueResult => ({
    runnableCount: 0,
    rejectedCount: rejections.length,
    rejections,
    enqueued: false,
  });

  const selectedCharacters = resolveStyleCharactersForTip(data, characterMap);
  if (!selectedCharacters.length) {
    return emptyResult();
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

  if (!runnableCharacters.length) {
    return emptyResult(rejections);
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
  const characterCount = selectedCharacters.length;

  selectedCharacters.forEach((character, characterIndex) => {
    if (!runnableNames.has(character.name)) {
      return;
    }

    const key = buildDedupeKey(character.name);
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

    paymentAnimations.push({
      playbackKey: key,
      traceMeta,
      run: wrapPaymentAnimation(() => {
        const segmentEnd = getSegmentEndMs(
          data.serverTs,
          data.playbackEndsAt,
          characterIndex,
          characterCount
        );
        if (shouldSkipPaymentSegment(Date.now(), segmentEnd)) {
          return noopPaymentAnimationHandle();
        }
        return createAnimationFromStyle(character, "payment", animationMount);
      }, traceContext),
    });

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
  };
}
