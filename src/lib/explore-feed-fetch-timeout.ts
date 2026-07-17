/** Fail-open wall-clock cap for the initial (boot) Explore feed batch fetch. */
export const EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Wall-clock cap for continuation (pagination) batch fetches.
 *
 * Pagination requests carry `excludeChannelIds`, so they always bypass the
 * backend default-feed cache and run the full candidate/access/metrics pipeline
 * (measured at ~8–12s under `connection_limit=1`). The boot fail-open cap
 * (10s) is deliberately tight so the shell renders fast, but for pagination the
 * user already has content on screen — aborting a healthy near-complete request
 * at 10s only forces a wasted retry cycle and a slower reschedule. Give
 * continuation fetches enough headroom to complete on the first attempt.
 */
export const EXPLORE_FEED_PAGINATION_FETCH_TIMEOUT_MS = 20_000;

/** Max wait for in-flight boot prefetch before proceeding to direct fetch. */
export const EXPLORE_FEED_PREFETCH_WAIT_TIMEOUT_MS = 10_000;
