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
  | "index"
  | "payment";

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

let cachedTraceContext: Record<string, string> | null = null;

/** Coarse device context for staging trace review (zero cost when debug off). */
function getTvTraceContext(): Record<string, string> {
  if (cachedTraceContext) return cachedTraceContext;
  if (typeof navigator === "undefined") {
    cachedTraceContext = { platform: "ssr", ua: "" };
    return cachedTraceContext;
  }
  cachedTraceContext = {
    platform: navigator.platform ?? "unknown",
    ua: (navigator.userAgent ?? "").slice(0, 160),
  };
  return cachedTraceContext;
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
    ...getTvTraceContext(),
    ...payload,
  });
}

/** Load timeline milestones for TTFV analysis (Phase 1+). */
export type TvLoadMilestone =
  | "T0"
  | "T1"
  | "T2"
  | "T3"
  | "T3_cache_hit"
  | "T3_cache_miss"
  | "T4"
  | "T5"
  | "T6";

const TV_LOAD_STORAGE_KEY = "tipmanna-tv-load-metrics-v1";
const recordedLoadMilestones = new Set<string>();

function readStoredLoadMetrics(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(TV_LOAD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredLoadMetrics(metrics: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TV_LOAD_STORAGE_KEY, JSON.stringify(metrics));
  } catch {
    /* quota / private mode */
  }
}

/** Zero-cost when debug disabled except performance.mark (negligible). */
export function tvLoadMark(
  milestone: TvLoadMilestone,
  payload: Record<string, unknown> = {}
): number {
  if (typeof window === "undefined") return 0;

  if (!recordedLoadMilestones.has("T0")) {
    recordedLoadMilestones.add("T0");
    performance.mark("tv:T0");
  }

  const msSinceNav = performance.now();
  if (!recordedLoadMilestones.has(milestone)) {
    recordedLoadMilestones.add(milestone);
    performance.mark(`tv:${milestone}`);
    const stored = readStoredLoadMetrics();
    stored[milestone] = msSinceNav;
    if (milestone === "T6" && stored.T0 == null) {
      stored.T0 = 0;
    }
    writeStoredLoadMetrics(stored);
  }

  if (isTvDebugEnabled()) {
    const stored = readStoredLoadMetrics();
    console.info(`[TV:load] ${milestone}`, {
      msSinceNav,
      ttfvMs: stored.T6,
      ...getTvTraceContext(),
      ...payload,
    });
    if (milestone === "T6" && stored.T6 != null) {
      console.info("[TV:load] summary", {
        ...stored,
        ttfvMs: stored.T6,
      });
    }
  }

  return msSinceNav;
}

/** Read persisted load milestones for this navigation (debug / QA export). */
export function getTvLoadMetrics(): Record<string, number> {
  return readStoredLoadMetrics();
}

/** Clear stored metrics (e.g. before a cold-load test run). */
export function resetTvLoadMetrics(): void {
  recordedLoadMilestones.clear();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(TV_LOAD_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Log playVideo() promise outcome without changing playback behavior. */
export function tracePlayVideoResult(source: string, result: unknown): void {
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
