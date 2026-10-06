import { tvScheduleSessionCacheKey } from "@/lib/tv-single-startup-schedule";

/** Remove one community schedule cache entry (deny / logout); never touches global key. */
export function clearTvScheduleSessionCacheForCommunity(
  communityId: string
): void {
  if (typeof window === "undefined") return;
  const cid = communityId?.trim();
  if (!cid) return;
  try {
    sessionStorage.removeItem(tvScheduleSessionCacheKey(cid));
  } catch {
    /* ignore */
  }
}

/** Warm TVProvider session cache so /tv can bootstrap from T3 without a cold fetch. */
export function persistTvScheduleSessionCache(
  body: unknown,
  etag: string | null,
  communityId: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    const key = tvScheduleSessionCacheKey(communityId);
    sessionStorage.setItem(key, JSON.stringify({ body, etag, at: Date.now() }));
  } catch {
    /* quota / private mode */
  }
}
