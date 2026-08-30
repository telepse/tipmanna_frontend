import { AnimationHandle } from "@/types/animation.types";
import { PAYMENT_WRAP } from "@/lib/animationContract";
import { animWarn } from "@/lib/animationDebug";
import { isNoOpAnimationHandle } from "@/lib/animation-style-registry";
import {
  derivePaymentCharacterPlaybackResult,
  shouldAttemptCycleTwo,
  type PaymentCycleOutcome,
  type PaymentCharacterPlaybackResult,
} from "@/lib/payment-animation-outcomes";
import {
  tracePaymentAnimation,
  tracePaymentAnimationError,
} from "@/lib/payment-animation-trace";

const SAFETY_TIMEOUT_MS = PAYMENT_WRAP.safetyTimeoutMs;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deterministic pause between payment cycle 1 and cycle 2 (Room + Screen stay aligned).
 * Target band 200–500ms.
 */
const PAYMENT_BETWEEN_CYCLES_GAP_MS = PAYMENT_WRAP.betweenCyclesMs;

const PAYMENT_SECOND_CYCLE_BEAT_MS = PAYMENT_WRAP.secondCycleBeatMs;

export interface PaymentAnimationTraceContext {
  surface?: string;
  eventId?: string;
  bundleId?: string;
  seq?: number;
  playbackKey?: string;
  characterName?: string;
  styleName?: string;
  onCharacterPlaybackFinished?: (result: {
    playbackResult: PaymentCharacterPlaybackResult;
    cycle1Outcome: PaymentCycleOutcome;
    cycle2Outcome: PaymentCycleOutcome | null;
  }) => void;
}

export type { PaymentCycleOutcome, PaymentCharacterPlaybackResult };

function traceCycleFinished(
  outcome: PaymentCycleOutcome,
  cycleNumber: 1 | 2,
  ctx?: PaymentAnimationTraceContext
): void {
  tracePaymentAnimation({
    stage: "payment_cycle_finished",
    cycleNumber,
    cycleOutcome: outcome,
    surface: ctx?.surface,
    eventId: ctx?.eventId,
    bundleId: ctx?.bundleId,
    seq: ctx?.seq,
    playbackKey: ctx?.playbackKey,
    characterName: ctx?.characterName,
    styleName: ctx?.styleName,
    result: outcome,
  });
}

function traceCharacterPlaybackFinished(
  result: PaymentCharacterPlaybackResult,
  cycle1: PaymentCycleOutcome,
  cycle2: PaymentCycleOutcome | null,
  ctx?: PaymentAnimationTraceContext
): void {
  tracePaymentAnimation({
    stage: "payment_character_playback_finished",
    playbackResult: result,
    cycle1Outcome: cycle1,
    cycle2Outcome: cycle2 ?? undefined,
    surface: ctx?.surface,
    eventId: ctx?.eventId,
    bundleId: ctx?.bundleId,
    seq: ctx?.seq,
    playbackKey: ctx?.playbackKey,
    characterName: ctx?.characterName,
    styleName: ctx?.styleName,
    result,
  });
}

async function runSinglePaymentPlay(
  factory: () => AnimationHandle,
  cycleNumber: 1 | 2,
  ctx?: PaymentAnimationTraceContext
): Promise<PaymentCycleOutcome> {
  tracePaymentAnimation({
    stage: "payment_cycle_started",
    cycleNumber,
    surface: ctx?.surface,
    eventId: ctx?.eventId,
    bundleId: ctx?.bundleId,
    seq: ctx?.seq,
    playbackKey: ctx?.playbackKey,
    characterName: ctx?.characterName,
    styleName: ctx?.styleName,
  });

  let handle: AnimationHandle;
  try {
    tracePaymentAnimation({
      stage: "animation_factory_invoked",
      cycleNumber,
      surface: ctx?.surface,
      bundleId: ctx?.bundleId,
      playbackKey: ctx?.playbackKey,
      characterName: ctx?.characterName,
      styleName: ctx?.styleName,
    });
    handle = factory();
    if (
      !handle ||
      typeof handle.finished?.then !== "function" ||
      typeof handle.stop !== "function"
    ) {
      tracePaymentAnimation({
        stage: "animation_handle_invalid",
        cycleNumber,
        surface: ctx?.surface,
        bundleId: ctx?.bundleId,
        playbackKey: ctx?.playbackKey,
        characterName: ctx?.characterName,
        styleName: ctx?.styleName,
        result: "invalid_handle",
      });
      traceCycleFinished("invalid_handle", cycleNumber, ctx);
      return "invalid_handle";
    }
    if (isNoOpAnimationHandle(handle)) {
      tracePaymentAnimation({
        stage: "payment_character_factory_rejected_unknown_style",
        cycleNumber,
        surface: ctx?.surface,
        bundleId: ctx?.bundleId,
        playbackKey: ctx?.playbackKey,
        characterName: ctx?.characterName,
        styleName: ctx?.styleName,
        reason: "unknown_style",
        result: "rejected",
      });
      traceCycleFinished("noop_or_skipped", cycleNumber, ctx);
      return "noop_or_skipped";
    }
    tracePaymentAnimation({
      stage: "animation_handle_returned",
      cycleNumber,
      surface: ctx?.surface,
      bundleId: ctx?.bundleId,
      playbackKey: ctx?.playbackKey,
      characterName: ctx?.characterName,
      styleName: ctx?.styleName,
      result: "ok",
    });
  } catch (err) {
    tracePaymentAnimationError("payment_cycle_failed", err, {
      cycleNumber,
      surface: ctx?.surface,
      bundleId: ctx?.bundleId,
      playbackKey: ctx?.playbackKey,
      characterName: ctx?.characterName,
      styleName: ctx?.styleName,
    });
    traceCycleFinished("factory_failed", cycleNumber, ctx);
    return "factory_failed";
  }

  handle.start?.();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<"timeout">(resolve => {
    timeoutId = setTimeout(() => {
      try {
        handle.stop();
      } catch {
        /* best-effort */
      }
      tracePaymentAnimation({
        stage: "animation_safety_timeout",
        cycleNumber,
        surface: ctx?.surface,
        bundleId: ctx?.bundleId,
        playbackKey: ctx?.playbackKey,
        characterName: ctx?.characterName,
        styleName: ctx?.styleName,
      });
      tracePaymentAnimation({
        stage: "animation_stop_invoked",
        cycleNumber,
        surface: ctx?.surface,
        bundleId: ctx?.bundleId,
        playbackKey: ctx?.playbackKey,
        result: "safety_timeout",
      });
      animWarn(
        "[wrapPaymentAnimation] safety timeout fired after",
        SAFETY_TIMEOUT_MS,
        "ms"
      );
      resolve("timeout");
    }, SAFETY_TIMEOUT_MS);
  });

  try {
    const winner = await Promise.race([
      handle.finished.then(() => "finished" as const),
      timeoutPromise,
    ]);

    if (winner === "finished") {
      tracePaymentAnimation({
        stage: "animation_finished_resolved",
        cycleNumber,
        surface: ctx?.surface,
        bundleId: ctx?.bundleId,
        playbackKey: ctx?.playbackKey,
        characterName: ctx?.characterName,
        styleName: ctx?.styleName,
      });
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      tracePaymentAnimation({
        stage: "payment_cycle_completed",
        cycleNumber,
        surface: ctx?.surface,
        bundleId: ctx?.bundleId,
        playbackKey: ctx?.playbackKey,
        characterName: ctx?.characterName,
        styleName: ctx?.styleName,
        result: "completed",
      });
      traceCycleFinished("completed", cycleNumber, ctx);
      return "completed";
    }

    traceCycleFinished("timed_out", cycleNumber, ctx);
    return "timed_out";
  } catch (err) {
    tracePaymentAnimation({
      stage: "animation_finished_rejected",
      cycleNumber,
      surface: ctx?.surface,
      bundleId: ctx?.bundleId,
      playbackKey: ctx?.playbackKey,
      characterName: ctx?.characterName,
      styleName: ctx?.styleName,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    traceCycleFinished("finished_rejected", cycleNumber, ctx);
    return "finished_rejected";
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Payment wrapper: runs the factory twice sequentially with a deterministic gap.
 * Each cycle is a fresh handle (cleanup from previous run is expected from the style).
 * Preview mode never uses this — only `createAnimationFromStyle(..., "payment")` paths.
 */
export function wrapPaymentAnimation(
  factory: () => AnimationHandle,
  traceContext?: PaymentAnimationTraceContext
): () => Promise<void> {
  return async () => {
    let cycle1: PaymentCycleOutcome = "factory_failed";
    let cycle2: PaymentCycleOutcome | null = null;

    try {
      cycle1 = await runSinglePaymentPlay(factory, 1, traceContext);

      if (shouldAttemptCycleTwo(cycle1)) {
        await sleep(PAYMENT_BETWEEN_CYCLES_GAP_MS);
        await sleep(PAYMENT_SECOND_CYCLE_BEAT_MS);
        cycle2 = await runSinglePaymentPlay(factory, 2, traceContext);
      }

      const playbackResult = derivePaymentCharacterPlaybackResult(
        cycle1,
        cycle2
      );

      if (playbackResult === "completed") {
        tracePaymentAnimation({
          stage: "payment_double_cycle_completed",
          surface: traceContext?.surface,
          eventId: traceContext?.eventId,
          bundleId: traceContext?.bundleId,
          seq: traceContext?.seq,
          playbackKey: traceContext?.playbackKey,
          characterName: traceContext?.characterName,
          styleName: traceContext?.styleName,
          result: "completed",
          playbackResult,
        });
      }

      traceCharacterPlaybackFinished(
        playbackResult,
        cycle1,
        cycle2,
        traceContext
      );
      traceContext?.onCharacterPlaybackFinished?.({
        playbackResult,
        cycle1Outcome: cycle1,
        cycle2Outcome: cycle2,
      });
    } catch (err) {
      tracePaymentAnimationError("payment_cycle_failed", err, {
        surface: traceContext?.surface,
        bundleId: traceContext?.bundleId,
        playbackKey: traceContext?.playbackKey,
        characterName: traceContext?.characterName,
        styleName: traceContext?.styleName,
      });
      traceCharacterPlaybackFinished(
        derivePaymentCharacterPlaybackResult(cycle1, cycle2),
        cycle1,
        cycle2,
        traceContext
      );
      traceContext?.onCharacterPlaybackFinished?.({
        playbackResult: derivePaymentCharacterPlaybackResult(cycle1, cycle2),
        cycle1Outcome: cycle1,
        cycle2Outcome: cycle2,
      });
    }
  };
}

export { clearPlaybackKeyState as clearPlayedAnimations } from "@/lib/playback-key-lifecycle";
