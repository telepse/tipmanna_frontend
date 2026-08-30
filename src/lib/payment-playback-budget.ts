import { PAYMENT_WRAP, type AnimationHandle } from "@/lib/animationContract";

/** Match {@link wrapPaymentAnimation} gaps — sourced from {@link PAYMENT_WRAP}. */
export const PAYMENT_BETWEEN_CYCLES_GAP_MS = PAYMENT_WRAP.betweenCyclesMs;
export const PAYMENT_SECOND_CYCLE_BEAT_MS = PAYMENT_WRAP.secondCycleBeatMs;

/**
 * Wall-clock budget for one character’s payment bundle (two plays + gaps).
 * Keep numeric formula in sync with backend `payment-playback-budget.util.ts`.
 */
export function paymentBundleMsPerCharacter(): number {
  return (
    2 * PAYMENT_WRAP.safetyTimeoutMs +
    PAYMENT_BETWEEN_CYCLES_GAP_MS +
    PAYMENT_SECOND_CYCLE_BEAT_MS
  );
}

export function computePlaybackEndsAt(
  serverTs: number,
  characterCount: number
): number {
  return serverTs + characterCount * paymentBundleMsPerCharacter();
}

/**
 * Wall-time end of the segment for `characterIndex` (0-based) within a tip of
 * `characterCount` characters. Uses `playbackEndsAt` from the server when set
 * (evenly subdivided); otherwise derives from {@link paymentBundleMsPerCharacter}.
 */
export function getSegmentEndMs(
  serverTs: number,
  playbackEndsAt: number | undefined,
  characterIndex: number,
  characterCount: number
): number {
  if (characterCount <= 0) return serverTs;
  if (typeof playbackEndsAt === "number" && playbackEndsAt > serverTs) {
    const span = playbackEndsAt - serverTs;
    return Math.round(
      serverTs + ((characterIndex + 1) / characterCount) * span
    );
  }
  return serverTs + (characterIndex + 1) * paymentBundleMsPerCharacter();
}

export function shouldSkipPaymentSegment(
  nowMs: number,
  segmentEndMs: number
): boolean {
  return nowMs >= segmentEndMs;
}

export function noopPaymentAnimationHandle(): AnimationHandle {
  return { stop: () => {}, finished: Promise.resolve() };
}
