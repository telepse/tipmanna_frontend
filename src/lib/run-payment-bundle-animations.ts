import type { RoomCharacter } from "@/types";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import {
  markPlayed,
  playedAnimations,
  wrapPaymentAnimation,
} from "@/lib/wrapPaymentAnimation";
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

/**
 * Shared payment path: Turbo/Galaxy companions for the bundle window, then
 * sequential character animations (unchanged).
 */
export function enqueuePaymentBundleForValidatedTip(options: {
  data: TipAnimationEvent;
  characterMap: Map<string, RoomCharacter>;
  /** Per-surface dedupe key, e.g. `${dedupeBase}-${name}` or `screen-${dedupeBase}-${name}`. */
  buildDedupeKey: (characterName: string) => string;
  enqueue: (tasks: (() => Promise<void>)[]) => void;
  animationMount?: HTMLElement;
  surface?: RealtimeSurface;
}): void {
  const {
    data,
    characterMap,
    buildDedupeKey,
    enqueue,
    animationMount,
    surface = "unknown",
  } = options;

  const selectedCharacters = resolveStyleCharactersForTip(data, characterMap);
  if (!selectedCharacters.length) return;

  logRealtimeTelemetry({
    event: "bundle_enqueue",
    surface,
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    playbackEndsAt: data.playbackEndsAt,
    characterCount: selectedCharacters.length,
    rewardTurbo: data.rewardTurbo,
    rewardGalaxy: data.rewardGalaxy,
    ts: Date.now(),
  });

  startPaymentRewardOverlays(data, animationMount);

  const paymentAnimations: (() => Promise<void>)[] = [];
  const characterCount = selectedCharacters.length;

  selectedCharacters.forEach((character, characterIndex) => {
    const key = buildDedupeKey(character.name);
    tracePaymentAnimation({
      stage: "playback_key_checked",
      surface,
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      playbackKey: key,
      characterName: character.name,
      styleName: character.styleName,
    });

    if (playedAnimations.has(key)) {
      tracePaymentAnimation({
        stage: "playback_key_duplicate",
        surface,
        eventId: data.eventId,
        bundleId: data.id,
        seq: data.seq,
        playbackKey: key,
        characterName: character.name,
        styleName: character.styleName,
        result: "skipped",
      });
      return;
    }

    markPlayed(key);
    tracePaymentAnimation({
      stage: "playback_key_marked",
      surface,
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      playbackKey: key,
      characterName: character.name,
      styleName: character.styleName,
      markPlayedTiming: "before_queue_acceptance",
    });

    const traceContext = {
      surface,
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      playbackKey: key,
      characterName: character.name,
      styleName: character.styleName,
    };

    paymentAnimations.push(
      wrapPaymentAnimation(() => {
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
      }, traceContext)
    );

    tracePaymentAnimation({
      stage: "playback_task_created",
      surface,
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
      playbackKey: key,
      characterName: character.name,
      styleName: character.styleName,
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
    });
    enqueue(paymentAnimations);
  }
}
