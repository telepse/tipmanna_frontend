/**
 * Must stay aligned with backend `EXPLORE_DEFAULT_FEED_BUCKET_MINUTES`
 * (set `NEXT_PUBLIC_EXPLORE_DEFAULT_FEED_BUCKET_MINUTES` to the same value).
 */
export function getExploreDefaultBucketMinutes(): number {
  const raw = parseInt(
    process.env.NEXT_PUBLIC_EXPLORE_DEFAULT_FEED_BUCKET_MINUTES ?? "15",
    10
  );
  return Number.isFinite(raw) && raw >= 1 ? raw : 15;
}

export function getExploreDefaultBucketId(now = Date.now()): number {
  const mins = getExploreDefaultBucketMinutes();
  return Math.floor(now / (mins * 60_000));
}
