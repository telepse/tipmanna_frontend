import { tvScheduleSessionCacheKey } from "@/lib/tv-single-startup-schedule";

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
