/**
 * Coalesces concurrent TV schedule load invocations into a single in-flight promise.
 * Mirrors explore-tv-prefetch-cache inflight dedup semantics.
 */
export function createTvScheduleLoadCoalescer() {
  let inflight: Promise<void> | null = null;

  return async function runCoalesced(fn: () => Promise<void>): Promise<void> {
    if (inflight) return inflight;
    const p = fn().finally(() => {
      if (inflight === p) inflight = null;
    });
    inflight = p;
    return p;
  };
}
