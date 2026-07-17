import { AnimationHandle } from "@/types/animation.types";
import { PAYMENT_WRAP } from "@/lib/animationContract";
import { animWarn } from "@/lib/animationDebug";

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

async function runSinglePaymentPlay(
  factory: () => AnimationHandle
): Promise<void> {
  const handle = factory();

  handle.start?.();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<"timeout">(resolve => {
    timeoutId = setTimeout(() => {
      try {
        handle.stop();
      } catch {
        /* best-effort */
      }
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
    if (winner === "finished" && timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  } catch {
    // swallow to protect queue
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
  factory: () => AnimationHandle
): () => Promise<void> {
  return async () => {
    await runSinglePaymentPlay(factory);
    await sleep(PAYMENT_BETWEEN_CYCLES_GAP_MS);
    await sleep(PAYMENT_SECOND_CYCLE_BEAT_MS);
    await runSinglePaymentPlay(factory);
  };
}

export const playedAnimations = new Set<string>();

const MAX_PLAYED_ENTRIES = 500;

export function markPlayed(key: string): void {
  playedAnimations.add(key);
  if (playedAnimations.size > MAX_PLAYED_ENTRIES) {
    const overflow = playedAnimations.size - MAX_PLAYED_ENTRIES;
    let removed = 0;
    for (const k of playedAnimations) {
      if (removed >= overflow) break;
      playedAnimations.delete(k);
      removed++;
    }
  }
}

export function clearPlayedAnimations() {
  playedAnimations.clear();
}
