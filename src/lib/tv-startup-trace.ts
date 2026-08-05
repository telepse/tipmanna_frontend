/**
 * TV Startup Latency — Phase 1 minimal diagnostic instrumentation.
 *
 * PURELY OBSERVATIONAL. This module never changes TV startup, schedule, player,
 * autoplay, retry, or overlay behaviour. Every public function returns early and
 * does negligible work when tracing is disabled.
 *
 * Enable with `NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED=1` (or `true`) or `?tvDebug=1`.
 * All output uses the single prefix `[TV_STARTUP_TRACE]`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { isTvStartupStabilityGuardActive } from "./tv-feature-flags";
import {
  getTvSsrYoutubePreconnectOrigins,
  isTvSsrYoutubePreconnectEnabled,
} from "./tv-youtube-preconnect-config";
import {
  applyYoutubeBootstrapToSummary,
  initYoutubeBootstrapTrace,
  notifyBootstrapT6,
  notifyBootstrapT8,
  notifyBootstrapT2,
  registerYoutubeBootstrapEventSink,
  resetYoutubeBootstrapTrace,
  stopYoutubeBootstrapTrace,
  type YoutubeApiDetectionReason,
  type LooperKind,
} from "./tv-youtube-bootstrap-trace";

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
const MAX_EVENT_LOG = 200;
const STABILITY_WINDOW_MS = 2_000;
const STARTUP_FAILURE_TIMEOUT_MS = 90_000;

/** Triggers counted as background schedule refreshes (not initial/retry network attempts). */
const SCHEDULE_REFRESH_TRIGGERS = new Set([
  "pusher",
  "visibility",
  "interval",
  "boundary",
  "sync_miss",
  "source_change",
  "manual",
]);

/** Events that interrupt a pending stable-playback window. */
const STABILITY_INTERRUPT_EVENTS = new Set<string>([
  "orchestrated_playback_command_issued",
  "loadVideoById",
  "setCurrentIndex",
  "source_reset",
  "player_error",
  "schedule_reset",
  "player_buffering",
]);

const ORCHESTRATED_COMMANDS = new Set(["loadVideoById", "seekTo", "playVideo"]);

export type TvStartupEventOptions = {
  canonicalMark?: CanonicalMark;
  trigger?: string;
  reason?: string;
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

export type TvStartupSummary = {
  traceId: string;
  startedAt: number;
  finalizedAt: number | null;
  marks: Partial<Record<CanonicalMark, number>>;
  segments: Record<string, number | null>;
  segmentDiagnostics: string[];
  totalTtfvMs: number | null;
  stableTtfvMs: number | null;
  overlayRemovedBeforePlaying: boolean | null;
  overlayLeadMs: number | null;
  overlayLagMs: number | null;
  /** @deprecated alias — equals scheduleNetworkAttemptCount */
  scheduleAttemptCount: number;
  scheduleNetworkAttemptCount: number;
  scheduleCacheBootstrapCount: number;
  scheduleRetryCount: number;
  scheduleRefreshCountDuringStartup: number;
  /** First real HTTP schedule attempt id for this navigation (diagnostic). */
  initialScheduleAttemptId: string | null;
  /** All real HTTP schedule attempt ids for this navigation (diagnostic). */
  scheduleAttemptIds: string[];
  /** Trigger on the first real HTTP schedule attempt. */
  initialScheduleTrigger: string | null;
  /** @deprecated use loadVideoByIdCount */
  playerLoadCommandCount: number;
  initialEmbedCount: number;
  loadVideoByIdCount: number;
  seekToCount: number;
  playVideoCount: number;
  totalPlaybackCommandCount: number;
  syncToLiveCount: number;
  currentIndexChangeCount: number;
  playerErrorCount: number;
  /** Phase C0 — counts by YouTube error code string key. */
  youtubeErrorCodeCounts: Record<string, number>;
  startupRecoveryCount: number;
  startupRecoveryCapReached: boolean;
  prePlaySeekSuppressedCount: number;
  duplicateLoadSuppressedCount: number;
  failedStartupTargetCount: number;
  /** Phase C1 — initial embed offset (integer seconds). */
  initialEmbedStartOffsetSeconds: number | null;
  initialEmbedUsedResolvedTarget: boolean;
  initialEmbedTargetMatchedFirstSync: boolean;
  /** Phase C1.1 — confirmed by any valid route (sync or first-PLAYING fallback). */
  initialEmbedTargetConfirmed: boolean;
  initialReloadAvoided: boolean;
  initialEmbedSuccessTrigger:
    | "first_sync_request_playback"
    | "first_sync_same_index"
    | "first_playing_fallback"
    | null;
  initialEmbedStaleReason: string | null;
  initialEmbedGenerationCount: number;
  /** Phase C1.1 — first T10 relative to first T11 (canonical marks unchanged). */
  firstBufferingRelativeToPlaying: "before" | "after" | null;
  /** Diagnostic — trigger per schedule HTTP attempt id. */
  scheduleAttemptTriggerById: Record<string, string>;
  /** Diagnostic — ordered schedule request triggers for this navigation. */
  scheduleRequestTriggers: string[];
  /** Phase C0.1 — stability guard released at T13 or terminal failure. */
  startupStabilityGuardReleased: boolean;
  startupStabilityGuardReleaseReason:
    | "stable_playback"
    | "terminal_failure"
    | null;
  /** Phase C0.1a — elapsed ms when startup_stability_guard_released was recorded. */
  startupStabilityGuardReleasedAtMs: number | null;
  postFirstPlayPreStableErrorCount: number;
  preStableSeekSuppressedCount: number;
  preStableCorrectiveSeekCount: number;
  retry10sOccurred: boolean;
  retry30sOccurred: boolean;
  retry60sOccurred: boolean;
  backendRebuildingOccurred: boolean;
  scheduleResponseSource: string | null;
  latestStage: string | null;
  finalState: "pending" | "stable" | "failed";
  postFinalizationEventCount: number;
  /** Phase C2.0 — T6→T8 bootstrap subsegments (null when flag off or marks missing). */
  T6_toLooperCommitMs: number | null;
  T6_toPlayerRenderRequestedMs: number | null;
  T6_toPlayerCommitMs: number | null;
  playerCommitToApiResourceStartMs: number | null;
  apiResourceStartToFinishMs: number | null;
  apiResourceFinishToObjectDetectedMs: number | null;
  playerCommitToApiObjectDetectedMs: number | null;
  playerCommitToIframeInsertedMs: number | null;
  apiObjectDetectedToIframeInsertedMs: number | null;
  iframeInsertedToT8Ms: number | null;
  playerCommitToT8Ms: number | null;
  youtubeApiPresentAtPlayerCommit: boolean | null;
  youtubeApiDetectionReason: YoutubeApiDetectionReason | null;
  youtubeResourceTimingDetailLevel: "full" | "limited" | null;
  youtubeApiResourceCount: number;
  youtubeWidgetResourceCount: number;
  youtubeEmbedDocumentCount: number;
  youtubeIframeInsertionCount: number;
  youtubeDuplicateIframeInsertionCount: number;
  looperKind: LooperKind | null;
  looperCommitCount: number;
  tvPlayerCommitCount: number;
  longTaskObserverSupported: boolean;
  longTaskCountT2ToT8: number;
  longTaskTotalDurationMsT2ToT8: number;
  longTaskMaxDurationMsT2ToT8: number;
  longTaskCountT6ToT8: number;
  longTaskTotalDurationMsT6ToT8: number;
  longTaskMaxDurationMsT6ToT8: number;
  youtubeApiDnsDurationMs: number | null;
  youtubeApiConnectDurationMs: number | null;
  youtubeApiTlsDurationMs: number | null;
  youtubeApiRequestWaitDurationMs: number | null;
  youtubeApiResponseDurationMs: number | null;
  youtubeApiConnectionReusedOrPreconnected: boolean | null;
  ssrYoutubePreconnectEnabled: boolean;
  ssrYoutubePreconnectOrigins: string[];
};

type TvStartupRun = {
  summary: TvStartupSummary;
  frozenSummary: TvStartupSummary | null;
  orchestratedT9Recorded: boolean;
  firstNetworkScheduleRecorded: boolean;
  stabilityTimer: ReturnType<typeof setTimeout> | null;
  failureTimer: ReturnType<typeof setTimeout> | null;
  playingReached: boolean;
  finalized: boolean;
  postFinalizationEvents: Array<Record<string, unknown>>;
};

let cachedEnabled: boolean | null = null;
let traceId: string | null = null;
let scheduleAttemptCounter = 0;
let currentRun: TvStartupRun | null = null;
let ambient: TvStartupContext = {};
let helperInstalled = false;
export type StartupStabilityGuardReleaseReason =
  | "stable_playback"
  | "terminal_failure";

export type StartupStabilityGuardReleaseCallback = (opts: {
  reason: StartupStabilityGuardReleaseReason;
  startupGeneration?: number;
}) => void;

let stabilityGuardReleaseCallback: StartupStabilityGuardReleaseCallback | null =
  null;
let getActiveStartupGeneration: (() => number | undefined) | null = null;
let stabilityGuardReleasedForRun = false;

/** Provider registers functional guard release (mark stable/terminal). */
export function setTvStartupStabilityGuardReleaseCallback(
  callback: StartupStabilityGuardReleaseCallback | null,
  readActiveStartupGeneration?: (() => number | undefined) | null
): void {
  stabilityGuardReleaseCallback = callback;
  getActiveStartupGeneration = readActiveStartupGeneration ?? null;
}

/**
 * Phase C0.1a — idempotent stability-guard release for the active startup run.
 * Emits `startup_stability_guard_released` and summary fields before finalization.
 */
export function releaseStartupStabilityGuardOnce(opts: {
  reason: StartupStabilityGuardReleaseReason;
  startupGeneration?: number;
}): boolean {
  const run = currentRun;
  if (!run || run.finalized || stabilityGuardReleasedForRun) return false;

  if (opts.startupGeneration != null && getActiveStartupGeneration) {
    const active = getActiveStartupGeneration();
    if (active != null && opts.startupGeneration !== active) {
      return false;
    }
  }

  stabilityGuardReleasedForRun = true;
  const at = nowMs();

  try {
    stabilityGuardReleaseCallback?.({
      reason: opts.reason,
      startupGeneration: opts.startupGeneration,
    });
  } catch {
    /* never let callback break trace */
  }

  emitEvent("startup_stability_guard_released", {
    trigger: opts.reason,
    data: {
      releaseReason: opts.reason,
      releasedAtMs: at,
      startupGeneration: opts.startupGeneration ?? null,
    },
  });
  return true;
}

/** @deprecated C0.1a — use setTvStartupStabilityGuardReleaseCallback */
export function setTvStartupStablePlaybackListener(
  listener: (() => void) | null
): void {
  if (listener == null) {
    stabilityGuardReleaseCallback = null;
    return;
  }
  stabilityGuardReleaseCallback = () => {
    listener();
  };
}

/** Finalize trace as failed (e.g. C0.1 terminal startup failure before timeout). */
export function tvStartupFinalizeFailed(reason: string): void {
  if (!isTvStartupTraceEnabled()) return;
  finalizeRun("failed", reason);
}

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
    /* fall through */
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 12)}`;
}

export function getTvStartupTraceId(): string | null {
  if (!isTvStartupTraceEnabled()) return null;
  if (!traceId) traceId = safeRandomId();
  return traceId;
}

/** One opaque id per real schedule HTTP request (independent of trace enablement). */
export function createScheduleAttemptId(): string {
  return safeRandomId();
}

/** Monotonic attempt index within the current page navigation startup trace. */
export function nextScheduleAttemptNumber(): number {
  scheduleAttemptCounter += 1;
  return scheduleAttemptCounter;
}

export function resetScheduleAttemptCounterForTests(): void {
  scheduleAttemptCounter = 0;
}

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

function createEmptySummary(id: string): TvStartupSummary {
  return {
    traceId: id,
    startedAt: Date.now(),
    finalizedAt: null,
    marks: {},
    segments: {},
    segmentDiagnostics: [],
    totalTtfvMs: null,
    stableTtfvMs: null,
    overlayRemovedBeforePlaying: null,
    overlayLeadMs: null,
    overlayLagMs: null,
    scheduleAttemptCount: 0,
    scheduleNetworkAttemptCount: 0,
    scheduleCacheBootstrapCount: 0,
    scheduleRetryCount: 0,
    scheduleRefreshCountDuringStartup: 0,
    initialScheduleAttemptId: null,
    scheduleAttemptIds: [],
    initialScheduleTrigger: null,
    playerLoadCommandCount: 0,
    initialEmbedCount: 0,
    loadVideoByIdCount: 0,
    seekToCount: 0,
    playVideoCount: 0,
    totalPlaybackCommandCount: 0,
    syncToLiveCount: 0,
    currentIndexChangeCount: 0,
    playerErrorCount: 0,
    youtubeErrorCodeCounts: {},
    startupRecoveryCount: 0,
    startupRecoveryCapReached: false,
    prePlaySeekSuppressedCount: 0,
    duplicateLoadSuppressedCount: 0,
    failedStartupTargetCount: 0,
    initialEmbedStartOffsetSeconds: null,
    initialEmbedUsedResolvedTarget: false,
    initialEmbedTargetMatchedFirstSync: false,
    initialEmbedTargetConfirmed: false,
    initialReloadAvoided: false,
    initialEmbedSuccessTrigger: null,
    initialEmbedStaleReason: null,
    initialEmbedGenerationCount: 0,
    firstBufferingRelativeToPlaying: null,
    scheduleAttemptTriggerById: {},
    scheduleRequestTriggers: [],
    startupStabilityGuardReleased: false,
    startupStabilityGuardReleaseReason: null,
    startupStabilityGuardReleasedAtMs: null,
    postFirstPlayPreStableErrorCount: 0,
    preStableSeekSuppressedCount: 0,
    preStableCorrectiveSeekCount: 0,
    retry10sOccurred: false,
    retry30sOccurred: false,
    retry60sOccurred: false,
    backendRebuildingOccurred: false,
    scheduleResponseSource: null,
    latestStage: null,
    finalState: "pending",
    postFinalizationEventCount: 0,
    T6_toLooperCommitMs: null,
    T6_toPlayerRenderRequestedMs: null,
    T6_toPlayerCommitMs: null,
    playerCommitToApiResourceStartMs: null,
    apiResourceStartToFinishMs: null,
    apiResourceFinishToObjectDetectedMs: null,
    playerCommitToApiObjectDetectedMs: null,
    playerCommitToIframeInsertedMs: null,
    apiObjectDetectedToIframeInsertedMs: null,
    iframeInsertedToT8Ms: null,
    playerCommitToT8Ms: null,
    youtubeApiPresentAtPlayerCommit: null,
    youtubeApiDetectionReason: null,
    youtubeResourceTimingDetailLevel: null,
    youtubeApiResourceCount: 0,
    youtubeWidgetResourceCount: 0,
    youtubeEmbedDocumentCount: 0,
    youtubeIframeInsertionCount: 0,
    youtubeDuplicateIframeInsertionCount: 0,
    looperKind: null,
    looperCommitCount: 0,
    tvPlayerCommitCount: 0,
    longTaskObserverSupported: false,
    longTaskCountT2ToT8: 0,
    longTaskTotalDurationMsT2ToT8: 0,
    longTaskMaxDurationMsT2ToT8: 0,
    longTaskCountT6ToT8: 0,
    longTaskTotalDurationMsT6ToT8: 0,
    longTaskMaxDurationMsT6ToT8: 0,
    youtubeApiDnsDurationMs: null,
    youtubeApiConnectDurationMs: null,
    youtubeApiTlsDurationMs: null,
    youtubeApiRequestWaitDurationMs: null,
    youtubeApiResponseDurationMs: null,
    youtubeApiConnectionReusedOrPreconnected: null,
    ssrYoutubePreconnectEnabled: false,
    ssrYoutubePreconnectOrigins: [],
  };
}

function resetForNewNavigation(): void {
  if (currentRun?.stabilityTimer != null) {
    clearTimeout(currentRun.stabilityTimer);
  }
  if (currentRun?.failureTimer != null) {
    clearTimeout(currentRun.failureTimer);
  }
  currentRun = null;
  traceId = null;
  scheduleAttemptCounter = 0;
  ambient = {};
  stabilityGuardReleasedForRun = false;
  resetYoutubeBootstrapTrace();
}

function ensureRun(): TvStartupRun | null {
  if (!isTvStartupTraceEnabled()) return null;
  if (currentRun) return currentRun;
  const id = getTvStartupTraceId();
  if (!id) return null;
  currentRun = {
    summary: createEmptySummary(id),
    frozenSummary: null,
    orchestratedT9Recorded: false,
    firstNetworkScheduleRecorded: false,
    stabilityTimer: null,
    failureTimer: null,
    playingReached: false,
    finalized: false,
    postFinalizationEvents: [],
  };
  installBrowserHelper();
  initYoutubeBootstrapTrace(id);
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
  if (run.finalized) return;
  if (run.summary.marks[mark] != null) return;
  run.summary.marks[mark] = at;
  run.summary.latestStage = mark;
  if (mark === "T6") notifyBootstrapT6(at);
  if (mark === "T8") notifyBootstrapT8(at);
  try {
    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark(PERFORMANCE_MARK_NAMES[mark]);
    }
  } catch {
    /* ignore */
  }
}

function maybeRecordInitialEmbedT9(
  run: TvStartupRun,
  event: string,
  at: number
) {
  if (run.orchestratedT9Recorded) return;
  if (event !== "initial_live_offset_embed_confirmed") return;
  run.orchestratedT9Recorded = true;
  recordCanonicalMark(run, "T9", at);
}

function maybeRecordOrchestratedT9(
  run: TvStartupRun,
  event: string,
  opts: TvStartupEventOptions,
  at: number
) {
  if (run.orchestratedT9Recorded) return;
  if (event !== "orchestrated_playback_command_issued") return;
  const command = opts.data?.command;
  if (typeof command !== "string" || !ORCHESTRATED_COMMANDS.has(command))
    return;
  run.orchestratedT9Recorded = true;
  recordCanonicalMark(run, "T9", at);
}

function maybeRecordFirstNetworkT3(
  run: TvStartupRun,
  event: string,
  at: number
) {
  if (event !== "schedule_request_started") return;
  if (run.firstNetworkScheduleRecorded) return;
  run.firstNetworkScheduleRecorded = true;
  recordCanonicalMark(run, "T3", at);
}

function syncLegacyCounterAliases(summary: TvStartupSummary) {
  summary.scheduleAttemptCount = summary.scheduleNetworkAttemptCount;
  summary.playerLoadCommandCount = summary.loadVideoByIdCount;
}

function updateCounters(
  run: TvStartupRun,
  event: string,
  opts: TvStartupEventOptions
) {
  if (run.finalized) return;
  const s = run.summary;
  const data = opts.data ?? {};
  const trigger = opts.trigger ?? "";

  switch (event) {
    case "schedule_request_started":
      s.scheduleNetworkAttemptCount += 1;
      if (trigger === "retry") s.scheduleRetryCount += 1;
      if (SCHEDULE_REFRESH_TRIGGERS.has(trigger)) {
        s.scheduleRefreshCountDuringStartup += 1;
      }
      if (trigger) {
        s.scheduleRequestTriggers.push(trigger);
      }
      {
        const attemptId = data.scheduleAttemptId;
        if (typeof attemptId === "string" && attemptId) {
          s.scheduleAttemptIds.push(attemptId);
          if (trigger) {
            s.scheduleAttemptTriggerById[attemptId] = trigger;
          }
          if (!s.initialScheduleAttemptId) {
            s.initialScheduleAttemptId = attemptId;
            s.initialScheduleTrigger = trigger || null;
          }
        }
      }
      syncLegacyCounterAliases(s);
      break;
    case "session_cache_bootstrap":
      s.scheduleCacheBootstrapCount += 1;
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
    case "initial_embed_created":
      s.initialEmbedCount += 1;
      if (typeof data.startupGeneration === "number") {
        s.initialEmbedGenerationCount = Math.max(
          s.initialEmbedGenerationCount,
          data.startupGeneration
        );
      }
      if (data.targetWasResolved === true) {
        s.initialEmbedUsedResolvedTarget = true;
      }
      {
        const off = data.startOffsetSeconds;
        if (typeof off === "number" && Number.isFinite(off)) {
          s.initialEmbedStartOffsetSeconds = off;
        }
      }
      break;
    case "initial_live_offset_embed_committed":
      break;
    case "initial_live_offset_embed_confirmed":
      if (data.targetWasResolved === true) {
        s.initialEmbedUsedResolvedTarget = true;
      }
      {
        const off = data.startOffsetSeconds;
        if (typeof off === "number" && Number.isFinite(off)) {
          s.initialEmbedStartOffsetSeconds = off;
        }
      }
      break;
    case "initial_embed_target_matched_first_sync":
      s.initialEmbedTargetMatchedFirstSync = true;
      break;
    case "initial_embed_target_confirmed": {
      s.initialEmbedTargetConfirmed = true;
      const successTrigger = data.trigger;
      if (
        successTrigger === "first_sync_request_playback" ||
        successTrigger === "first_sync_same_index" ||
        successTrigger === "first_playing_fallback"
      ) {
        s.initialEmbedSuccessTrigger = successTrigger;
      }
      break;
    }
    case "initial_embed_success_rejected":
      break;
    case "initial_embed_target_stale":
      if (typeof data.reason === "string") {
        s.initialEmbedStaleReason = data.reason;
      }
      break;
    case "initial_reload_avoided":
      s.initialReloadAvoided = true;
      break;
    case "orchestrated_playback_command_issued": {
      const command = data.command;
      if (typeof command !== "string") break;
      s.totalPlaybackCommandCount += 1;
      if (command === "loadVideoById") s.loadVideoByIdCount += 1;
      else if (command === "seekTo") s.seekToCount += 1;
      else if (command === "playVideo") s.playVideoCount += 1;
      syncLegacyCounterAliases(s);
      break;
    }
    case "syncToLive":
      s.syncToLiveCount += 1;
      break;
    case "setCurrentIndex":
      s.currentIndexChangeCount += 1;
      break;
    case "player_error":
      s.playerErrorCount += 1;
      {
        const code = data.youtubeErrorCode;
        if (typeof code === "number" && Number.isFinite(code)) {
          const key = String(code);
          s.youtubeErrorCodeCounts[key] =
            (s.youtubeErrorCodeCounts[key] ?? 0) + 1;
        }
      }
      break;
    case "youtube_error_classified":
      break;
    case "startup_error_recovery_started":
      s.startupRecoveryCount += 1;
      break;
    case "startup_recovery_cap_reached":
      s.startupRecoveryCapReached = true;
      break;
    case "startup_error_target_skipped":
      s.failedStartupTargetCount += 1;
      break;
    case "pre_play_drift_seek_suppressed":
      s.prePlaySeekSuppressedCount += 1;
      break;
    case "duplicate_pre_play_load_suppressed":
      s.duplicateLoadSuppressedCount += 1;
      break;
    case "startup_stability_guard_activated":
      break;
    case "post_first_play_pre_stable_error":
      s.postFirstPlayPreStableErrorCount += 1;
      break;
    case "pre_stable_drift_seek_suppressed":
      s.preStableSeekSuppressedCount += 1;
      break;
    case "pre_stable_corrective_seek_issued":
      s.preStableCorrectiveSeekCount += 1;
      break;
    case "startup_stability_guard_released": {
      s.startupStabilityGuardReleased = true;
      const releaseReason = data.releaseReason ?? opts.trigger ?? opts.reason;
      if (
        releaseReason === "stable_playback" ||
        releaseReason === "terminal_failure"
      ) {
        s.startupStabilityGuardReleaseReason = releaseReason;
      }
      {
        const releasedAt = data.releasedAtMs;
        if (typeof releasedAt === "number" && Number.isFinite(releasedAt)) {
          s.startupStabilityGuardReleasedAtMs = releasedAt;
        }
      }
      break;
    }
    case "startup_terminal_failure":
      break;
    default:
      break;
  }
}

function isPlayingState(state: string | null | undefined): boolean {
  return state === "PLAYING";
}

function clearStabilityTimer(run: TvStartupRun) {
  if (run.stabilityTimer != null) {
    clearTimeout(run.stabilityTimer);
    run.stabilityTimer = null;
  }
}

function handleStability(run: TvStartupRun, event: string) {
  if (run.finalized) return;

  if (event === "player_playing") {
    if (!run.playingReached) run.playingReached = true;
    startStabilityWindow(run);
    return;
  }

  if (!run.playingReached || run.stabilityTimer == null) return;

  if (STABILITY_INTERRUPT_EVENTS.has(event)) {
    clearStabilityTimer(run);
    emitEvent("stability_interrupted", { reason: event });
  }
}

function startStabilityWindow(run: TvStartupRun) {
  if (run.finalized) return;
  clearStabilityTimer(run);
  run.stabilityTimer = safeSetTimeout(() => {
    run.stabilityTimer = null;
    if (run.finalized) return;

    const state = ambient.playerState ?? null;
    if (!isPlayingState(state)) {
      emitEvent("stability_interrupted", {
        reason: "not_playing_at_window_end",
        data: { playerState: state, overlayVisible: ambient.overlayVisible },
      });
      return;
    }

    if (isTvStartupStabilityGuardActive()) {
      releaseStartupStabilityGuardOnce({ reason: "stable_playback" });
    }

    emitEvent("stable_playback", {
      canonicalMark: "T13",
      data: {
        playerState: state,
        overlayVisible: ambient.overlayVisible,
        currentIndex: ambient.currentIndex,
      },
    });
    finalizeRun("stable", "two_second_window_elapsed");
  }, STABILITY_WINDOW_MS);
}

function computeSummary(run: TvStartupRun): TvStartupSummary {
  const marks = run.summary.marks;
  const segments: Record<string, number | null> = {};
  const diagnostics: string[] = [];

  for (let i = 1; i < CANONICAL_ORDER.length; i += 1) {
    const prev = CANONICAL_ORDER[i - 1];
    const cur = CANONICAL_ORDER[i];
    const a = marks[prev];
    const b = marks[cur];
    const key = `${prev}_${cur}`;
    if (a == null || b == null) {
      segments[key] = null;
      if (a == null && b != null) {
        diagnostics.push(`missing_${prev}_before_${cur}`);
      }
      continue;
    }
    if (b < a) {
      segments[key] = null;
      diagnostics.push(`reordered_${prev}_after_${cur}`);
      continue;
    }
    segments[key] = b - a;
  }

  const playing = marks.T11 ?? null;
  const overlay = marks.T12 ?? null;

  let overlayRemovedBeforePlaying: boolean | null = null;
  let overlayLeadMs: number | null = null;
  let overlayLagMs: number | null = null;

  if (playing != null && overlay != null) {
    if (overlay < playing) {
      overlayRemovedBeforePlaying = true;
      overlayLeadMs = playing - overlay;
      overlayLagMs = null;
    } else {
      overlayRemovedBeforePlaying = false;
      overlayLeadMs = null;
      overlayLagMs = overlay - playing;
    }
  } else if (overlay != null && playing == null) {
    overlayRemovedBeforePlaying = true;
  }

  const buffering = marks.T10 ?? null;
  let firstBufferingRelativeToPlaying: "before" | "after" | null = null;
  if (buffering != null && playing != null) {
    firstBufferingRelativeToPlaying = buffering < playing ? "before" : "after";
  }

  run.summary.segments = segments;
  run.summary.segmentDiagnostics = diagnostics;
  run.summary.firstBufferingRelativeToPlaying = firstBufferingRelativeToPlaying;
  run.summary.totalTtfvMs =
    playing != null || overlay != null
      ? Math.max(playing ?? 0, overlay ?? 0)
      : null;
  run.summary.stableTtfvMs = marks.T13 ?? null;
  run.summary.overlayRemovedBeforePlaying = overlayRemovedBeforePlaying;
  run.summary.overlayLeadMs = overlayLeadMs;
  run.summary.overlayLagMs = overlayLagMs;
  syncLegacyCounterAliases(run.summary);
  run.summary.ssrYoutubePreconnectEnabled = isTvSsrYoutubePreconnectEnabled();
  run.summary.ssrYoutubePreconnectOrigins = getTvSsrYoutubePreconnectOrigins();
  applyYoutubeBootstrapToSummary(
    run.summary,
    marks.T6 ?? null,
    marks.T8 ?? null
  );
  return run.summary;
}

function cloneSummary(summary: TvStartupSummary): TvStartupSummary {
  return JSON.parse(JSON.stringify(summary)) as TvStartupSummary;
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
    /* quota / private mode */
  }
}

function validateStabilityReleaseBeforeFinalize(
  run: TvStartupRun,
  state: "stable" | "failed"
): void {
  if (!isTvStartupStabilityGuardActive()) return;

  const s = run.summary;
  const released = s.startupStabilityGuardReleased;
  const releaseReason = s.startupStabilityGuardReleaseReason;

  if (released !== (releaseReason != null)) {
    s.segmentDiagnostics.push("stability_release_inconsistent_state");
  }
  if (!released) {
    s.segmentDiagnostics.push("stability_release_missing_before_finalization");
  }
  if (
    state === "stable" &&
    releaseReason != null &&
    releaseReason !== "stable_playback"
  ) {
    s.segmentDiagnostics.push("stability_release_wrong_reason_for_stable");
  }
  if (
    state === "failed" &&
    releaseReason != null &&
    releaseReason !== "terminal_failure"
  ) {
    s.segmentDiagnostics.push("stability_release_wrong_reason_for_failure");
  }
}

function finalizeRun(state: "stable" | "failed", reason: string): void {
  const run = currentRun;
  if (!run || run.finalized) return;

  run.finalized = true;
  clearStabilityTimer(run);
  if (run.failureTimer != null) {
    clearTimeout(run.failureTimer);
    run.failureTimer = null;
  }

  run.summary.finalState = state;
  validateStabilityReleaseBeforeFinalize(run, state);
  stopYoutubeBootstrapTrace();
  if (state === "failed") {
    logPostFinalizationEvent("startup_failed", {
      reason,
      latestStage: run.summary.latestStage,
    });
  }

  computeSummary(run);
  run.summary.finalizedAt = Date.now();
  run.summary.postFinalizationEventCount = run.postFinalizationEvents.length;
  run.frozenSummary = cloneSummary(run.summary);
  persistSummary(run.frozenSummary);
  logRaw("summary", {
    ...run.frozenSummary,
    finalizeReason: reason,
  });
}

function getReadableSummary(): TvStartupSummary | null {
  if (currentRun?.frozenSummary) return currentRun.frozenSummary;
  if (currentRun) {
    computeSummary(currentRun);
    return cloneSummary(currentRun.summary);
  }
  const all = readAllSummaries();
  return all.length ? all[all.length - 1] : null;
}

function logRaw(event: string, payload: Record<string, unknown>) {
  try {
    console.info(`${LOG_PREFIX} ${event}`, payload);
  } catch {
    /* ignore */
  }
}

function logPostFinalizationEvent(
  event: string,
  payload: Record<string, unknown>
) {
  const run = currentRun;
  if (!run) return;
  run.postFinalizationEvents.push({ event, ...payload, ts: nowMs() });
  if (run.postFinalizationEvents.length > MAX_EVENT_LOG) {
    run.postFinalizationEvents.shift();
  }
  if (run.frozenSummary) {
    run.frozenSummary.postFinalizationEventCount =
      run.postFinalizationEvents.length;
  }
  logRaw(`post_finalization:${event}`, {
    traceId: run.summary.traceId,
    ...payload,
  });
}

function emitEvent(event: string, opts: TvStartupEventOptions = {}): void {
  const run = ensureRun();
  if (!run) return;

  try {
    const at = nowMs();

    if (run.finalized) {
      logPostFinalizationEvent(event, {
        trigger: opts.trigger ?? null,
        reason: opts.reason ?? null,
        ...(opts.data ?? {}),
      });
      return;
    }

    if (opts.canonicalMark) {
      recordCanonicalMark(run, opts.canonicalMark, at);
    }
    maybeRecordFirstNetworkT3(run, event, at);
    maybeRecordInitialEmbedT9(run, event, at);
    maybeRecordOrchestratedT9(run, event, opts, at);
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

    if (event === "tv_provider_mounted") {
      notifyBootstrapT2();
    }

    handleStability(run, event);
  } catch {
    /* never let trace work break playback */
  }
}

export function tvStartupEvent(
  event: string,
  opts: TvStartupEventOptions = {}
): void {
  if (!isTvStartupTraceEnabled()) return;
  emitEvent(event, opts);
}

export function updateTvStartupContext(partial: TvStartupContext): void {
  if (!isTvStartupTraceEnabled()) return;
  ambient = { ...ambient, ...partial };
}

export function markTvStartupNavigation(): void {
  if (!isTvStartupTraceEnabled()) return;
  if (currentRun?.finalized) resetForNewNavigation();
  const run = ensureRun();
  if (!run || run.finalized) return;
  if (run.summary.marks.T0 == null) {
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
    getLatest: () => getReadableSummary(),
    getAll: () => readAllSummaries(),
    copyLatest: () => {
      const latest = getReadableSummary();
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

export function getTvStartupSummaries(): TvStartupSummary[] {
  return readAllSummaries();
}

export function __resetTvStartupTraceForTest(): void {
  cachedEnabled = null;
  traceId = null;
  stabilityGuardReleaseCallback = null;
  getActiveStartupGeneration = null;
  stabilityGuardReleasedForRun = false;
  if (currentRun?.stabilityTimer != null)
    clearTimeout(currentRun.stabilityTimer);
  if (currentRun?.failureTimer != null) clearTimeout(currentRun.failureTimer);
  currentRun = null;
  ambient = {};
  helperInstalled = false;
  resetYoutubeBootstrapTrace();
}

registerYoutubeBootstrapEventSink((event, opts) => {
  emitEvent(event, {
    reason: opts?.reason,
    data: opts?.data,
  });
});
