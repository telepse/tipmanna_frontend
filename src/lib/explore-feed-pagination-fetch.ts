/**
 * Bounded server-action fetch for Explore feed continuation (pagination).
 *
 * Continuation batches bypass the default-feed cache and measured p95 latency
 * approaches the per-attempt ceiling. A single pagination cycle uses one total
 * wall-clock budget with exactly one server-action attempt per cycle.
 * Recoverable retries are scheduled by the Feed UI after cooldown — not
 * overlapping immediate server-action retries (which abandoned backend work).
 */
import {
  runServerFetch,
  type ActionResult,
  type ServerActionFetchInit,
} from "@/lib/action-fetch";
import {
  EXPLORE_FEED_PAGINATION_FETCH_TIMEOUT_MS,
  EXPLORE_FEED_PAGINATION_MAX_ATTEMPTS,
  EXPLORE_FEED_PAGINATION_TOTAL_DEADLINE_MS,
} from "@/lib/explore-feed-fetch-timeout";

export {
  EXPLORE_FEED_PAGINATION_FETCH_TIMEOUT_MS,
  EXPLORE_FEED_PAGINATION_MAX_ATTEMPTS,
  EXPLORE_FEED_PAGINATION_TOTAL_DEADLINE_MS,
};

/** Theoretical worst-case before bounded pagination fetch (legacy contract). */
export const LEGACY_PAGINATION_WORST_CASE_MS =
  4 * EXPLORE_FEED_PAGINATION_FETCH_TIMEOUT_MS + 400 + 800 + 1_600;

/** Worst-case after bounded pagination fetch (total deadline cap). */
export const BOUNDED_PAGINATION_WORST_CASE_MS =
  EXPLORE_FEED_PAGINATION_TOTAL_DEADLINE_MS;

export function runExplorePaginationServerFetch<T>(
  url: string,
  init: ServerActionFetchInit | undefined,
  context: string,
  mapSuccess?: (raw: unknown) => T
): Promise<ActionResult<T>> {
  return runServerFetch(url, init, context, mapSuccess, {
    maxAttempts: EXPLORE_FEED_PAGINATION_MAX_ATTEMPTS,
    totalDeadlineMs: EXPLORE_FEED_PAGINATION_TOTAL_DEADLINE_MS,
  });
}
