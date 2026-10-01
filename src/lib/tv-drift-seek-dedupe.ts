/** Mirrors tv-provider DRIFT_THRESHOLD_S — used to detect post-seek alignment. */
export const DRIFT_SEEK_DEDUPE_THRESHOLD_S = 3;

export type DriftSeekDedupeRecord = {
  startupGeneration: number;
  scheduleIndex: number;
  videoId: string;
  targetSeconds: number;
  actualAtIssue: number;
};

/** Material movement since last drift seek (seconds). */
export const DRIFT_SEEK_MATERIAL_MOVE_S = 0.5;

export function clearDriftSeekDedupe(): null {
  return null;
}

export function shouldSuppressIdenticalDriftSeek(opts: {
  record: DriftSeekDedupeRecord | null;
  startupGeneration: number;
  scheduleIndex: number;
  videoId: string;
  targetSeconds: number;
  actual: number;
}): boolean {
  const r = opts.record;
  if (!r) return false;
  if (r.startupGeneration !== opts.startupGeneration) return false;
  if (r.scheduleIndex !== opts.scheduleIndex) return false;
  if (r.videoId !== opts.videoId) return false;
  if (r.targetSeconds !== opts.targetSeconds) return false;

  if (
    Math.abs(opts.actual - opts.targetSeconds) <= DRIFT_SEEK_DEDUPE_THRESHOLD_S
  ) {
    return true;
  }

  if (Math.abs(opts.actual - r.actualAtIssue) > DRIFT_SEEK_MATERIAL_MOVE_S) {
    return false;
  }

  return true;
}

export function recordDriftSeekIssued(opts: {
  startupGeneration: number;
  scheduleIndex: number;
  videoId: string;
  targetSeconds: number;
  actual: number;
}): DriftSeekDedupeRecord {
  return {
    startupGeneration: opts.startupGeneration,
    scheduleIndex: opts.scheduleIndex,
    videoId: opts.videoId,
    targetSeconds: opts.targetSeconds,
    actualAtIssue: opts.actual,
  };
}
