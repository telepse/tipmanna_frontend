/**
 * Coalesces concurrent TV schedule load invocations into a single in-flight promise
 * per community source key. Mirrors explore-tv-prefetch-cache inflight dedup semantics.
 */
export function tvScheduleCoalesceKey(communityId: string | null): string {
  return communityId ?? "__global__";
}

/** True when the schedule source changed while a fetch was in flight. */
export function isScheduleResponseStale(
  fetchCommunityId: string | null,
  currentCommunityId: string | null
): boolean {
  return fetchCommunityId !== currentCommunityId;
}

export function createTvScheduleLoadCoalescer() {
  const inflight = new Map<string, Promise<void>>();

  return async function runCoalesced(
    communityId: string | null,
    fn: () => Promise<void>
  ): Promise<void> {
    const key = tvScheduleCoalesceKey(communityId);
    const existing = inflight.get(key);
    if (existing) return existing;
    const p = fn().finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
    inflight.set(key, p);
    return p;
  };
}
