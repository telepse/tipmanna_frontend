/** Mirrors tv-provider DRIFT_THRESHOLD_S. */
export const GLOBAL_SAME_ROW_DRIFT_THRESHOLD_S = 3;

/**
 * Ordinary same-row GLOBAL drift while PLAYING must not seek backward when the
 * computed live target is behind the player (viewer would see a rewind).
 */
export function shouldSuppressBackwardSameRowDriftWhilePlaying(opts: {
  actual: number;
  target: number;
  thresholdSeconds?: number;
  playerState: string | null;
}): boolean {
  const threshold = opts.thresholdSeconds ?? GLOBAL_SAME_ROW_DRIFT_THRESHOLD_S;
  if (opts.playerState !== "PLAYING") return false;
  return opts.actual > opts.target + threshold;
}

/** Whether same-row drift should issue a forward catch-up seek. */
export function shouldIssueForwardSameRowDriftSeek(opts: {
  actual: number;
  target: number;
  thresholdSeconds?: number;
}): boolean {
  const threshold = opts.thresholdSeconds ?? GLOBAL_SAME_ROW_DRIFT_THRESHOLD_S;
  return opts.actual + threshold < opts.target;
}
