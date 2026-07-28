/**
 * Authoritative payment playback outcome contracts (Phase E3C).
 * Import from this module only — do not duplicate these unions elsewhere.
 */

/** Result of a single payment animation cycle attempt. */
export type PaymentCycleOutcome =
  | "completed"
  | "timed_out"
  | "factory_failed"
  | "invalid_handle"
  | "finished_rejected"
  | "noop_or_skipped";

/** Aggregate result for one character's payment playback task. */
export type PaymentCharacterPlaybackResult =
  | "completed"
  | "partially_completed"
  | "failed"
  | "skipped";

/** Whether cycle 2 should run after cycle 1 (E3C locked policy). */
export function shouldAttemptCycleTwo(cycle1: PaymentCycleOutcome): boolean {
  return cycle1 === "completed" || cycle1 === "timed_out";
}

/** Derive character-level playback result from per-cycle outcomes. */
export function derivePaymentCharacterPlaybackResult(
  cycle1: PaymentCycleOutcome,
  cycle2: PaymentCycleOutcome | null
): PaymentCharacterPlaybackResult {
  if (cycle1 === "noop_or_skipped" || cycle2 === "noop_or_skipped") {
    return "skipped";
  }

  if (
    cycle1 === "factory_failed" ||
    cycle1 === "invalid_handle" ||
    cycle1 === "finished_rejected"
  ) {
    return "failed";
  }

  if (cycle2 === null) {
    return cycle1 === "completed" ? "partially_completed" : "failed";
  }

  if (
    cycle2 === "factory_failed" ||
    cycle2 === "invalid_handle" ||
    cycle2 === "finished_rejected"
  ) {
    return cycle1 === "completed" ? "partially_completed" : "failed";
  }

  if (cycle1 === "completed" && cycle2 === "completed") {
    return "completed";
  }

  if (cycle1 === "completed" || cycle2 === "completed") {
    return "partially_completed";
  }

  return "failed";
}
