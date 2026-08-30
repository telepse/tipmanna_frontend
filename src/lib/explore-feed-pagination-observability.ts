/** Client-side Explore pagination lifecycle observability (PR-8 aligned, no PII). */

export const EXPLORE_PAGINATION_OBS_ENABLED =
  process.env.NEXT_PUBLIC_EXPLORE_PAGINATION_OBS_ENABLED !== "false";

export type ExplorePaginationObsPhase =
  | "request"
  | "success"
  | "retry"
  | "failure"
  | "exhaustion"
  | "resume"
  | "duplicate_batch";

export type ExplorePaginationObsPayload = {
  phase: ExplorePaginationObsPhase;
  feedMode: "trends" | "saves" | "community";
  uiCycle?: number;
  traceId?: string;
  itemCount?: number;
  batchSize?: number;
  newItems?: number;
  failStreak?: number;
  backoffMs?: number;
  activeIndex?: number;
  reason?: string;
  coalesceStage?: string;
  coalesceKeyHash?: string;
  coalesceInstanceId?: string;
  fetchDurationMs?: number;
  aborted?: boolean;
};

export function logExplorePagination(opts: ExplorePaginationObsPayload): void {
  if (!EXPLORE_PAGINATION_OBS_ENABLED) return;
  if (typeof console === "undefined") return;
  console.info(
    JSON.stringify({
      event: "explore_pagination",
      ...opts,
    })
  );
}
