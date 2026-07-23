/**
 * TV Startup Latency — Phase 1 minimal diagnostic instrumentation.
 *
 * PURELY OBSERVATIONAL. This module never changes TV startup, schedule, player,
 * autoplay, retry, or overlay behaviour. Every public function returns early and
 * does negligible work when tracing is disabled.
 *
 * Enable with `NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1` (or `true`) or `?tvDebug=1`.
 * All output uses the single prefix `[TV_STARTUP_TRACE]`.
 *
 * This is intentionally separate from `tvDebugLog.ts` (existing `tvLoadMark` /
 * `tvTrace` marks are preserved and NOT renamed). Canonical marks here use the
 * `tv-startup:*` performance-mark namespace and a `canonicalMark` field so they
 * never collide with the existing internal `tv:T0..T6` labels.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CanonicalMark =
  | "T0"
  | "T1"
  | "T2"
  | "T3"
  | "T4"
  | "T5"
  | "T6"
  | "T7"
  | "T8"
  | "T9"
  | "T10"
  | "T11"
  | "T12"
  | "T13";

/** Canonical mark → performance.mark() name (must not overwrite existing marks). */
const PERFORMANCE_MARK_NAMES: Record<CanonicalMark, string> = {
  T0: "tv-startup:navigation-start",
  T1: "tv-startup:html-response-start",
  T2: "tv-startup:provider-mounted",
  T3: "tv-startup:schedule-request-start",
  T4: "tv-startup:schedule-accepted",
  T5: "tv-startup:playlist-selected",
  T6: "tv-startup:position-resolved",
  T7: "tv-startup:youtube-api",
  T8: "tv-startup:player-ready",
  T9: "tv-startup:playback-command",
  T10: "tv-startup:buffering",
  T11: "tv-startup:playing",
  T12: "tv-startup:overlay-removed",
  T13: "tv-startup:stable-playback",
};

const LOG_PREFIX = "[TV_STARTUP_TRACE]";
const SESSION_STORAGE_KEY = "tipmanna-tv-startup-traces-v1";
const MAX_TRACE_HISTORY = 25;
const STABILITY_WINDOW_MS = 2_000;
/** Safety net: if no stable playback within this window, emit `startup_failed`. */
const STARTUP_FAILURE_TIMEOUT_MS = 90_000;

/** Events that interrupt a pending stable-playback window (per spec). */
const STABILITY_INTERRUPT_EVENTS = new Set<string>([
  "loadVideoById",
  "setCurrentIndex",
  "source_reset",
  "player_error",
  "schedule_reset",
]);

export type TvStartupEventOptions = {
  canonicalMark?: CanonicalMark;
  trigger?: string;
  reason?: string;
  /** Extra non-sensitive fields. Never pass tokens, cookies, full IDs or titles. */
  data?: Record<string, unknown>;
};

type TvStartupContext = {
  currentIndex?: number | null;
  playerState?: string | null;
  scheduleReady?: boolean | null;
  playerReady?: boolean | null;
  overlayVisible?: boolean | null;
  source?: string | null;
};

type TvStartupSummary = {
  traceId: string;
  startedAt: number;
  marks: Partial<Record<CanonicalMark, number>>;
  segments: Record<string, number>;
  totalTtfvMs: number | null;
  stableTtfvMs: number | null;
  scheduleAttemptCount: number;
  scheduleRetryCount: number;
  playerLoadCommandCount: number;
  seekCount: number;
  playCommandCount: number;
  syncToLiveCount: number;
  currentIndexChangeCount: number;
  playerErrorCount: number;
  retry10sOccurred: boolean;
  retry30sOccurred: boolean;
  retry60sOccurred: boolean;
  backendRebuildingOccurred: boolean;
  scheduleResponseSource: string | null;
  latestStage: string | null;
  finalState: "pending" | "stable" | "failed";
};

type TvStartupRun = {
  summary: TvStartupSummary;
  stabilityTimer: ReturnType<typeof setTimeout> | null;
  failureTimer: ReturnType<typeof setTimeout> | null;
  playingReached: boolean;
  finalized: boolean;
};

let cachedEnabled: boolean | null = null;
let traceId: string | null = null;
let currentRun: TvStartupRun | null = null;
let ambient: TvStartupContext = {};
let helperInstalled = false;

/** Ordered canonical marks for adjacent-segment computation. */
const CANONICAL_ORDER: CanonicalMark[] = [
  "T0",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
  "T13",
];

function readQueryDebugFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("tvDebug");
  } catch {
    return false;
  }
}

export function isTvStartupTraceEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled;
  const envVal = process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
  const envEnabled = envVal === "1" || envVal === "true";
  cachedEnabled = envEnabled || readQueryDebugFlag();
  return cachedEnabled;
}

function safeRandomId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      return Array.from(buf, b => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through to Math.random */
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 12)}`;
}

/**
 * Returns the correlation ID for this page load, or null when tracing is disabled.
 * Generated once and retained for the page lifetime. Safe random — never derived
 * from user data.
 */
export function getTvStartupTraceId(): string | null {
  if (!isTvStartupTraceEnabled()) return null;
  if (!traceId) traceId = safeRandomId();
  return traceId;
}

/**
 * Non-reversible short token for correlating an ID across events without
 * exposing the full value. Deterministic within a run so the same video/schedule
 * ID produces the same token. Never used for security.
 */
export function hashShortId(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return `#${(h >>> 0).toString(36)}`;
}

function nowMs(): number {
  try {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
  } catch {
    /* ignore */
  }
  return Date.now();
}

function ensureRun(): TvStartupRun | null {
  if (!isTvStartupTraceEnabled()) return null;
  if (currentRun) return currentRun;
  const id = getTvStartupTraceId();
  if (!id) return null;
  currentRun = {
    summary: {
      traceId: id,
      startedAt: Date.now(),
      marks: {},
      segments: {},
      totalTtfvMs: null,
      stableTtfvMs: null,
      scheduleAttemptCount: 0,
      scheduleRetryCount: 0,
      playerLoadCommandCount: 0,
      seekCount: 0,
      playCommandCount: 0,
      syncToLiveCount: 0,
      currentIndexChangeCount: 0,
      playerErrorCount: 0,
      retry10sOccurred: false,
      retry30sOccurred: false,
      retry60sOccurred: false,
      backendRebuildingOccurred: false,
      scheduleResponseSource: null,
      latestStage: null,
      finalState: "pending",
    },
    stabilityTimer: null,
    failureTimer: null,
    playingReached: false,
    finalized: false,
  };
  installBrowserHelper();
  currentRun.failureTimer = safeSetTimeout(() => {
    finalizeRun("failed", "startup_failure_timeout");
  }, STARTUP_FAILURE_TIMEOUT_MS);
  return currentRun;
}

function safeSetTimeout(
  fn: () => void,
  ms: number
): ReturnType<typeof setTimeout> | null {
  try {
    return setTimeout(() => {
      try {
        fn();
      } catch {
        /* never let trace work break playback */
      }
    }, ms);
  } catch {
    return null;
  }
}

function recordCanonicalMark(
  run: TvStartupRun,
  mark: CanonicalMark,
  at: number
) {
  if (run.summary.marks[mark] != null) return; // emit-once
  run.summary.marks[mark] = at;
  run.summary.latestStage = mark;
  try {
    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark(PERFORMANCE_MARK_NAMES[mark]);
    }
  } catch {
    /* ignore */
  }
}

function updateCounters(
  run: TvStartupRun,
  event: string,
  opts: TvStartupEventOptions
) {
  const s = run.summary;
  const data = opts.data ?? {};
  switch (event) {
    case "schedule_request_started":
      s.scheduleAttemptCount += 1;
      if (opts.trigger === "retry") s.scheduleRetryCount += 1;
      break;
    case "schedule_request_finished": {
      const delay = data.retryDelayMs;
      if (delay === 10_000) s.retry10sOccurred = true;
      else if (delay === 30_000) s.retry30sOccurred = true;
      else if (delay === 60_000) s.retry60sOccurred = true;
      break;
    }
    case "schedule_payload_accepted": {
      if (typeof data.source === "string")
        s.scheduleResponseSource = data.source;
      if (data.rebuilding === true) s.backendRebuildingOccurred = true;
      break;
    }
    case "playback_command_issued": {
      const command = data.command;
      if (command === "loadVideoById" || command === "initial_embed") {
        s.playerLoadCommandCount += 1;
      } else if (command === "seekTo") {
        s.seekCount += 1;
      } else if (command === "playVideo") {
        s.playCommandCount += 1;
      }
      break;
    }
    case "seekTo":
      s.seekCount += 1;
      break;
    case "syncToLive":
      s.syncToLiveCount += 1;
      break;
    case "setCurrentIndex":
      s.currentIndexChangeCount += 1;
      break;
    case "player_error":
      s.playerErrorCount += 1;
      break;
    default:
      break;
  }
}

function handleStability(run: TvStartupRun, event: string) {
  if (event === "player_playing") {
    if (!run.playingReached) run.playingReached = true;
    startStabilityWindow(run);
    return;
  }
  // Only interrupt once playback has begun and a window is pending.
  if (!run.playingReached || run.finalized) return;
  const interrupt =
    STABILITY_INTERRUPT_EVENTS.has(event) ||
    (event === "playback_command_issued" && run.stabilityTimer != null);
  if (interrupt && run.stabilityTimer != null) {
    clearTimeout(run.stabilityTimer);
    run.stabilityTimer = null;
    emitEvent("stability_interrupted", { reason: event });
    startStabilityWindow(run);
  }
}

function startStabilityWindow(run: TvStartupRun) {
  if (run.finalized) return;
  if (run.stabilityTimer != null) clearTimeout(run.stabilityTimer);
  run.stabilityTimer = safeSetTimeout(() => {
    run.stabilityTimer = null;
    emitEvent("stable_playback", { canonicalMark: "T13" });
    finalizeRun("stable", "two_second_window_elapsed");
  }, STABILITY_WINDOW_MS);
}

function computeSummary(run: TvStartupRun) {
  const marks = run.summary.marks;
  const segments: Record<string, number> = {};
  for (let i = 1; i < CANONICAL_ORDER.length; i += 1) {
    const prev = CANONICAL_ORDER[i - 1];
    const cur = CANONICAL_ORDER[i];
    const a = marks[prev];
    const b = marks[cur];
    if (a != null && b != null) segments[`${prev}_${cur}`] = b - a;
  }
  run.summary.segments = segments;
  const playing = marks.T11 ?? null;
  const overlay = marks.T12 ?? null;
  run.summary.totalTtfvMs =
    playing != null || overlay != null
      ? Math.max(playing ?? 0, overlay ?? 0)
      : null;
  run.summary.stableTtfvMs = marks.T13 ?? null;
}

function persistSummary(summary: TvStartupSummary) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as TvStartupSummary[]) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    list.push(summary);
    while (list.length > MAX_TRACE_HISTORY) list.shift();
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — never throw */
  }
}

function finalizeRun(state: "stable" | "failed", reason: string): void {
  const run = currentRun;
  if (!run || run.finalized) return;
  run.finalized = true;
  if (run.stabilityTimer != null) {
    clearTimeout(run.stabilityTimer);
    run.stabilityTimer = null;
  }
  if (run.failureTimer != null) {
    clearTimeout(run.failureTimer);
    run.failureTimer = null;
  }
  run.summary.finalState = state;
  if (state === "failed") {
    emitEvent("startup_failed", {
      reason,
      data: { latestStage: run.summary.latestStage },
    });
  }
  computeSummary(run);
  persistSummary(run.summary);
  logRaw("summary", {
    ...run.summary,
    finalizeReason: reason,
  });
}

function logRaw(event: string, payload: Record<string, unknown>) {
  try {
    console.info(`${LOG_PREFIX} ${event}`, payload);
  } catch {
    /* ignore */
  }
}

/** Internal emit used by both public API and lifecycle timers (assumes enabled). */
function emitEvent(event: string, opts: TvStartupEventOptions = {}): void {
  const run = ensureRun();
  if (!run) return;
  try {
    const at = nowMs();
    if (opts.canonicalMark) recordCanonicalMark(run, opts.canonicalMark, at);
    updateCounters(run, event, opts);

    const record = {
      traceId: run.summary.traceId,
      event,
      canonicalMark: opts.canonicalMark ?? null,
      ts: at,
      elapsedMs: at,
      trigger: opts.trigger ?? null,
      reason: opts.reason ?? null,
      currentIndex: ambient.currentIndex ?? null,
      playerState: ambient.playerState ?? null,
      scheduleReady: ambient.scheduleReady ?? null,
      playerReady: ambient.playerReady ?? null,
      overlayVisible: ambient.overlayVisible ?? null,
      source: ambient.source ?? null,
      ...(opts.data ?? {}),
    };
    logRaw(event, record);

    handleStability(run, event);
  } catch {
    /* never let trace work break playback */
  }
}

/**
 * Public entry point. Emits one structured startup trace event.
 * No-op (single boolean check) when tracing is disabled.
 */
export function tvStartupEvent(
  event: string,
  opts: TvStartupEventOptions = {}
): void {
  if (!isTvStartupTraceEnabled()) return;
  emitEvent(event, opts);
}

/**
 * Merge low-frequency ambient context (index, player/schedule/overlay state,
 * source) shared by subsequent events. No-op when disabled.
 */
export function updateTvStartupContext(partial: TvStartupContext): void {
  if (!isTvStartupTraceEnabled()) return;
  ambient = { ...ambient, ...partial };
}

/** Convenience: emit navigation_start (T0) + html_response_start (T1) once. */
export function markTvStartupNavigation(): void {
  if (!isTvStartupTraceEnabled()) return;
  const run = ensureRun();
  if (!run) return;
  if (run.summary.marks.T0 == null) {
    // T0 is navigation origin; performance.now() elapsed is 0-based on it.
    recordCanonicalMark(run, "T0", 0);
    logRaw("navigation_start", {
      traceId: run.summary.traceId,
      canonicalMark: "T0",
      elapsedMs: 0,
      timeOrigin:
        typeof performance !== "undefined" ? performance.timeOrigin : null,
    });
  }
  if (run.summary.marks.T1 == null) {
    let responseStart: number | null = null;
    try {
      const navEntries = performance.getEntriesByType(
        "navigation"
      ) as PerformanceNavigationTiming[];
      if (navEntries && navEntries[0]) {
        responseStart = navEntries[0].responseStart;
      }
    } catch {
      responseStart = null;
    }
    if (responseStart != null) {
      recordCanonicalMark(run, "T1", responseStart);
      logRaw("html_response_start", {
        traceId: run.summary.traceId,
        canonicalMark: "T1",
        elapsedMs: responseStart,
      });
    }
  }
}

type TvStartupHelper = {
  getLatest: () => TvStartupSummary | null;
  getAll: () => TvStartupSummary[];
  copyLatest: () => string;
  clear: () => void;
};

function readAllSummaries(): TvStartupSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as TvStartupSummary[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function installBrowserHelper() {
  if (helperInstalled || typeof window === "undefined") return;
  helperInstalled = true;
  const helper: TvStartupHelper = {
    getLatest: () => {
      // Prefer the in-flight run so analysts can read before finalize.
      if (currentRun) {
        computeSummary(currentRun);
        return currentRun.summary;
      }
      const all = readAllSummaries();
      return all.length ? all[all.length - 1] : null;
    },
    getAll: () => readAllSummaries(),
    copyLatest: () => {
      const latest = currentRun
        ? (computeSummary(currentRun), currentRun.summary)
        : (readAllSummaries().slice(-1)[0] ?? null);
      const json = JSON.stringify(latest, null, 2);
      try {
        navigator.clipboard?.writeText(json);
      } catch {
        /* clipboard unavailable */
      }
      return json;
    },
    clear: () => {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
  };
  try {
    (window as any).__TIPMANNA_TV_STARTUP_TRACE__ = helper;
  } catch {
    /* ignore */
  }
}

/** Read persisted summaries (debug / QA export). */
export function getTvStartupSummaries(): TvStartupSummary[] {
  return readAllSummaries();
}

/**
 * Test-only reset of module state. Not used by production code paths.
 */
export function __resetTvStartupTraceForTest(): void {
  cachedEnabled = null;
  traceId = null;
  if (currentRun?.stabilityTimer != null)
    clearTimeout(currentRun.stabilityTimer);
  if (currentRun?.failureTimer != null) clearTimeout(currentRun.failureTimer);
  currentRun = null;
  ambient = {};
  helperInstalled = false;
}
