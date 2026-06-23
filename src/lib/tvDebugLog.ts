/**
 * TV debug logging: zero work when disabled (early return before string building).
 * Enable with ?tvDebug=1 or NEXT_PUBLIC_TV_DEBUG=true
 */

let queryParsed = false;
let queryDebugFlag = false;

function readQueryDebug(): boolean {
  if (typeof window === "undefined") return false;
  if (!queryParsed) {
    queryParsed = true;
    queryDebugFlag = new URLSearchParams(window.location.search).has("tvDebug");
  }
  return queryDebugFlag;
}

export function isTvDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_TV_DEBUG === "true") return true;
  return readQueryDebug();
}

export function logTV(event: string, payload: Record<string, unknown>): void {
  if (!isTvDebugEnabled()) return;

  console.info(`[TV] ${event}`, {
    timestamp: Date.now(),
    ...payload,
  });
}

/** Structured trace categories for Phase 0 playback lifecycle analysis. */
export type TvTraceCategory =
  | "playback"
  | "schedule"
  | "navigation"
  | "autoplay"
  | "fullscreen"
  | "index";

const YT_STATE_NAMES: Record<number, string> = {
  [-1]: "UNSTARTED",
  0: "ENDED",
  1: "PLAYING",
  2: "PAUSED",
  3: "BUFFERING",
  5: "CUED",
};

export function ytStateName(state: number): string {
  return YT_STATE_NAMES[state] ?? `UNKNOWN_${state}`;
}

/** Zero-cost when debug disabled; use for Phase 0 instrumentation only. */
export function tvTrace(
  category: TvTraceCategory,
  event: string,
  payload: Record<string, unknown> = {}
): void {
  if (!isTvDebugEnabled()) return;
  console.info(`[TV:${category}] ${event}`, {
    timestamp: Date.now(),
    ...payload,
  });
}

/** Log playVideo() promise outcome without changing playback behavior. */
export function tracePlayVideoResult(
  source: string,
  result: unknown
): void {
  if (!isTvDebugEnabled()) return;
  const maybePromise = result as Promise<void> | undefined;
  if (
    maybePromise != null &&
    typeof maybePromise === "object" &&
    typeof maybePromise.then === "function"
  ) {
    void maybePromise.then(
      () => {
        tvTrace("autoplay", "play_success", { source });
      },
      (err: unknown) => {
        tvTrace("autoplay", "play_rejected", {
          source,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    );
  }
}
