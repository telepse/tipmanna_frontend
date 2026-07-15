/** Pure pagination policy helpers (Endless Feed Contract). */

export const EXPLORE_PAGINATION_BACKOFF_INITIAL_MS = 1_000;
export const EXPLORE_PAGINATION_BACKOFF_MAX_MS = 30_000;
export const EXPLORE_PAGINATION_BACKOFF_MULTIPLIER = 2;

/** Exponential backoff capped at EXPLORE_PAGINATION_BACKOFF_MAX_MS (failStreak >= 1). */
export function computePaginationBackoffMs(failStreak: number): number {
  if (failStreak <= 0) return EXPLORE_PAGINATION_BACKOFF_INITIAL_MS;
  const ms =
    EXPLORE_PAGINATION_BACKOFF_INITIAL_MS *
    EXPLORE_PAGINATION_BACKOFF_MULTIPLIER ** (failStreak - 1);
  return Math.min(EXPLORE_PAGINATION_BACKOFF_MAX_MS, ms);
}

export function mergeBatchDedup<T extends { id?: string }>(
  prev: T[],
  batch: T[]
): { items: T[]; newCount: number } {
  const seen = new Set(prev.map(x => x.id).filter(Boolean));
  const out = [...prev];
  let newCount = 0;
  for (const it of batch) {
    if (it?.id && !seen.has(it.id)) {
      seen.add(it.id);
      out.push(it);
      newCount += 1;
    }
  }
  return { items: out, newCount };
}

/** Non-empty API batch where every id was already in the feed. */
export function isDuplicateOnlyBatch<T extends { id?: string }>(
  prev: T[],
  batch: T[]
): boolean {
  if (batch.length === 0) return false;
  const seen = new Set(prev.map(x => x.id).filter(Boolean));
  return batch.every(it => !it?.id || seen.has(it.id));
}

/**
 * Only confirmed backend exhaustion may permanently end the feed.
 * Empty 200 on trends/community; saves auth gates handled separately in UI.
 */
export function isConfirmedFeedExhaustion(opts: {
  batchLength: number;
  feedMode: "trends" | "saves" | "community";
  hadExcludeIds: boolean;
}): boolean {
  if (opts.batchLength > 0) return false;
  if (opts.feedMode === "saves") return false;
  if (opts.feedMode === "trends" && !opts.hadExcludeIds) {
    return true;
  }
  return opts.batchLength === 0;
}
