import { AnimationHandle } from "@/types/animation.types";
import { PAYMENT_WRAP } from "@/lib/animationContract";
import { animWarn } from "@/lib/animationDebug";
import { isNoOpAnimationHandle } from "@/lib/animation-style-registry";
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
}

async function runSinglePaymentPlay(
  factory: () => AnimationHandle,
  cycleNumber: 1 | 2,
  ctx?: PaymentAnimationTraceContext
): Promise<boolean> {
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
      return false;
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
      return false;
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
    return false;
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
    }
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
    // swallow to protect queue
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    tracePaymentAnimation({
      stage: "payment_cycle_completed",
      cycleNumber,
      surface: ctx?.surface,
      bundleId: ctx?.bundleId,
      playbackKey: ctx?.playbackKey,
      characterName: ctx?.characterName,
      styleName: ctx?.styleName,
    });
  }
  return true;
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
    try {
      const cycle1Ok = await runSinglePaymentPlay(factory, 1, traceContext);
      if (!cycle1Ok) return;
      await sleep(PAYMENT_BETWEEN_CYCLES_GAP_MS);
      await sleep(PAYMENT_SECOND_CYCLE_BEAT_MS);
      const cycle2Ok = await runSinglePaymentPlay(factory, 2, traceContext);
      if (!cycle2Ok) return;
      tracePaymentAnimation({
        stage: "payment_double_cycle_completed",
        surface: traceContext?.surface,
        eventId: traceContext?.eventId,
        bundleId: traceContext?.bundleId,
        seq: traceContext?.seq,
        playbackKey: traceContext?.playbackKey,
        characterName: traceContext?.characterName,
        styleName: traceContext?.styleName,
        result: "ok",
      });
    } catch (err) {
      tracePaymentAnimationError("payment_cycle_failed", err, {
        surface: traceContext?.surface,
        bundleId: traceContext?.bundleId,
        playbackKey: traceContext?.playbackKey,
        characterName: traceContext?.characterName,
        styleName: traceContext?.styleName,
      });
    }
  };
}

export { clearPlaybackKeyState as clearPlayedAnimations } from "@/lib/playback-key-lifecycle";
