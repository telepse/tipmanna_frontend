/**
 * Phase C2.2 — TV-route early YouTube IFrame API warm-up (T2 trigger).
 * Observational + script acquisition only; never creates iframe or player.
 */

import { isTvEarlyYoutubeApiWarmupEnabled } from "./tv-feature-flags";
import {
  acquireYoutubeIframeApi,
  getYoutubeIframeApiAbsoluteDeadlineMs,
  getYoutubeIframeApiLoadPromise,
  getYoutubeIframeApiRemainingDeadlineMs,
  isYoutubeIframeApiReady,
  type YoutubeIframeApiAcquireResult,
} from "./youtube-iframe-api-loader";

export const TV_YOUTUBE_API_WARMUP_TIMEOUT_MS = 8000;

export type EarlyYoutubeApiWarmupOutcome =
  | "disabled"
  | "reused_existing_object"
  | "reused_existing_script"
  | "resolved_by_warmup"
  | "timed_out_player_fallback"
  | "failed_player_fallback";

export type YoutubeChildMountFallbackReason =
  | "api_ready"
  | "warmup_resolved"
  | "absolute_deadline"
  | "warmup_failed"
  | "warmup_not_requested"
  | "flag_off"
  | null;

type WarmupEventSink = (
  event: string,
  opts?: { data?: Record<string, unknown>; reason?: string }
) => void;

type WarmupState = {
  requested: boolean;
  requestedAtMs: number | null;
  absoluteDeadlineMs: number | null;
  resolvedAtMs: number | null;
  outcome: EarlyYoutubeApiWarmupOutcome | null;
  acquireOutcome: YoutubeIframeApiAcquireResult["outcome"] | null;
  trigger: string | null;
  childMountDeferred: boolean;
  childMountDeferredAtMs: number | null;
  childMountReleasedAtMs: number | null;
  childMountFallbackReason: YoutubeChildMountFallbackReason;
  youtubeApiPresentAtT6: boolean | null;
  apiPresentAtReactYoutubeMount: boolean | null;
  warmupFallbackDuplicateApiResource: boolean;
};

let eventSink: WarmupEventSink | null = null;
let state: WarmupState = createInitialState();

function createInitialState(): WarmupState {
  return {
    requested: false,
    requestedAtMs: null,
    absoluteDeadlineMs: null,
    resolvedAtMs: null,
    outcome: null,
    acquireOutcome: null,
    trigger: null,
    childMountDeferred: false,
    childMountDeferredAtMs: null,
    childMountReleasedAtMs: null,
    childMountFallbackReason: null,
    youtubeApiPresentAtT6: null,
    apiPresentAtReactYoutubeMount: null,
    warmupFallbackDuplicateApiResource: false,
  };
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

export function registerTvYoutubeApiWarmupEventSink(
  sink: WarmupEventSink
): void {
  eventSink = sink;
}

function emitWarmupEvent(
  event: string,
  opts?: { data?: Record<string, unknown>; reason?: string }
): void {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
  try {
    eventSink?.(event, opts);
  } catch {
    /* never break playback */
  }
}

function mapAcquireToWarmupOutcome(
  result: YoutubeIframeApiAcquireResult
): EarlyYoutubeApiWarmupOutcome {
  if (result.state === "ready") {
    if (result.outcome === "reused_existing_object") {
      return "reused_existing_object";
    }
    if (result.outcome === "reused_existing_script") {
      return "reused_existing_script";
    }
    return "resolved_by_warmup";
  }
  if (result.outcome === "timed_out") {
    return "timed_out_player_fallback";
  }
  return "failed_player_fallback";
}

function mapAcquireToTraceEvent(result: YoutubeIframeApiAcquireResult): string {
  if (result.state === "ready") {
    if (result.outcome === "reused_existing_object") {
      return "youtube_api_warmup_reused_existing_object";
    }
    if (result.outcome === "reused_existing_script") {
      return "youtube_api_warmup_reused_existing_script";
    }
    return "youtube_api_warmup_script_inserted";
  }
  if (result.outcome === "timed_out") {
    return "youtube_api_warmup_timed_out";
  }
  return "youtube_api_warmup_failed";
}

/**
 * Fire-and-forget warm-up at T2. Does not await; does not block schedule.
 *
 * Eligibility: every mounted TVProvider on the TV route is eligible for TV
 * content display. There is no synchronous access/redirect gate at T2 that
 * would require skipping warm-up — SideChick redirects are async and schedule
 * filtering remains backend-owned.
 */
export function requestTvYoutubeApiWarmup(opts: {
  trigger: "tv_provider_mounted";
}): void {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
  if (typeof window === "undefined") return;
  if (state.requested) return;

  state.requested = true;
  state.trigger = opts.trigger;
  state.requestedAtMs = nowMs();
  state.absoluteDeadlineMs =
    state.requestedAtMs + TV_YOUTUBE_API_WARMUP_TIMEOUT_MS;

  emitWarmupEvent("youtube_api_warmup_requested", {
    data: {
      trigger: opts.trigger,
      elapsedMs: state.requestedAtMs,
      absoluteDeadlineMs: state.absoluteDeadlineMs,
    },
  });

  void acquireYoutubeIframeApi({
    absoluteDeadlineMs: state.absoluteDeadlineMs,
  }).then(result => {
    if (state.resolvedAtMs != null) return;
    state.resolvedAtMs = nowMs();
    state.acquireOutcome = result.outcome;
    state.outcome = mapAcquireToWarmupOutcome(result);

    const traceEvent = mapAcquireToTraceEvent(result);
    emitWarmupEvent(traceEvent, {
      data: {
        trigger: opts.trigger,
        outcome: state.outcome,
        acquireOutcome: result.outcome,
        elapsedMs: state.resolvedAtMs,
        durationMs:
          state.requestedAtMs != null
            ? state.resolvedAtMs - state.requestedAtMs
            : null,
      },
    });

    if (result.state === "ready") {
      emitWarmupEvent("youtube_api_warmup_resolved", {
        data: {
          trigger: opts.trigger,
          outcome: state.outcome,
          elapsedMs: state.resolvedAtMs,
        },
      });
    }
  });
}

export function isTvYoutubeApiWarmupActive(): boolean {
  return isTvEarlyYoutubeApiWarmupEnabled() && state.requested;
}

export function getTvYoutubeApiWarmupPromise(): Promise<YoutubeIframeApiAcquireResult> | null {
  if (!state.requested) return null;
  return getYoutubeIframeApiLoadPromise();
}

export function getTvYoutubeApiWarmupRemainingMs(): number | null {
  if (!state.requested) return null;
  return getYoutubeIframeApiRemainingDeadlineMs();
}

export function getTvYoutubeApiWarmupAbsoluteDeadlineMs(): number | null {
  if (!state.requested) return state.absoluteDeadlineMs;
  return state.absoluteDeadlineMs ?? getYoutubeIframeApiAbsoluteDeadlineMs();
}

export function shouldDeferYoutubeChildMount(): boolean {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) return false;
  if (!state.requested) return false;
  return !isYoutubeIframeApiReady();
}

export function recordYoutubeChildMountDeferred(opts: {
  startupGeneration?: number;
}): void {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
  if (state.childMountDeferred) return;
  state.childMountDeferred = true;
  state.childMountDeferredAtMs = nowMs();
  emitWarmupEvent("youtube_child_mount_deferred", {
    data: {
      startupGeneration: opts.startupGeneration ?? null,
      elapsedMs: state.childMountDeferredAtMs,
      remainingDeadlineMs: getTvYoutubeApiWarmupRemainingMs(),
    },
  });
}

export function recordYoutubeChildMountReleased(opts: {
  startupGeneration?: number;
  fallbackReason: YoutubeChildMountFallbackReason;
}): void {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
  const at = nowMs();
  if (state.childMountReleasedAtMs == null) {
    state.childMountReleasedAtMs = at;
  }
  state.childMountFallbackReason = opts.fallbackReason;

  const event =
    opts.fallbackReason === "api_ready" ||
    opts.fallbackReason === "warmup_resolved"
      ? "youtube_child_mount_released"
      : "youtube_child_mount_fallback";

  emitWarmupEvent(event, {
    reason: opts.fallbackReason ?? undefined,
    data: {
      startupGeneration: opts.startupGeneration ?? null,
      fallbackReason: opts.fallbackReason,
      elapsedMs: at,
      remainingDeadlineMs: getTvYoutubeApiWarmupRemainingMs(),
      deferredDurationMs:
        state.childMountDeferredAtMs != null
          ? at - state.childMountDeferredAtMs
          : null,
    },
  });
}

export function recordYoutubeApiPresentAtT6(present: boolean): void {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
  state.youtubeApiPresentAtT6 = present;
}

export function recordYoutubeApiPresentAtReactYoutubeMount(
  present: boolean
): void {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
  state.apiPresentAtReactYoutubeMount = present;
}

export function markWarmupFallbackDuplicateApiResource(): void {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
  state.warmupFallbackDuplicateApiResource = true;
  emitWarmupEvent("duplicate_api_resource", {
    reason: "warmup_fallback_duplicate_api_resource",
    data: { diagnostic: "warmup_fallback_duplicate_api_resource" },
  });
}

export type TvYoutubeApiWarmupSummaryFields = {
  earlyYoutubeApiWarmupEnabled: boolean;
  earlyYoutubeApiWarmupTrigger: string | null;
  earlyYoutubeApiWarmupRequestedAtMs: number | null;
  earlyYoutubeApiWarmupResolvedAtMs: number | null;
  earlyYoutubeApiWarmupDurationMs: number | null;
  earlyYoutubeApiWarmupOutcome: EarlyYoutubeApiWarmupOutcome | null;
  youtubeApiPresentAtT6: boolean | null;
  youtubeApiWarmupResolvedBeforeT6: boolean | null;
  youtubeApiWarmupLeadBeforePlayerCommitMs: number | null;
  youtubeChildMountDeferredForWarmup: boolean;
  youtubeChildMountDeferredAtMs: number | null;
  youtubeChildMountReleasedAtMs: number | null;
  youtubeChildMountDeferredDurationMs: number | null;
  youtubeChildMountFallbackReason: YoutubeChildMountFallbackReason;
  youtubeApiPresentAtReactYoutubeMount: boolean | null;
};

export function buildTvYoutubeApiWarmupSummaryFields(
  t6Mark: number | null | undefined,
  playerCommitMs: number | null | undefined
): TvYoutubeApiWarmupSummaryFields {
  const enabled = isTvEarlyYoutubeApiWarmupEnabled();
  const requested = state.requestedAtMs;
  const resolved = state.resolvedAtMs;
  const t6 = t6Mark ?? null;
  const commit = playerCommitMs ?? null;

  let resolvedBeforeT6: boolean | null = null;
  if (resolved != null && t6 != null) {
    resolvedBeforeT6 = resolved <= t6;
  }

  let leadBeforeCommit: number | null = null;
  if (resolved != null && commit != null && resolved <= commit) {
    leadBeforeCommit = commit - resolved;
  }

  return {
    earlyYoutubeApiWarmupEnabled: enabled,
    earlyYoutubeApiWarmupTrigger: enabled ? state.trigger : null,
    earlyYoutubeApiWarmupRequestedAtMs: enabled ? requested : null,
    earlyYoutubeApiWarmupResolvedAtMs: enabled ? resolved : null,
    earlyYoutubeApiWarmupDurationMs:
      enabled && requested != null && resolved != null
        ? resolved - requested
        : null,
    earlyYoutubeApiWarmupOutcome: enabled
      ? (state.outcome ?? (state.requested ? null : "disabled"))
      : "disabled",
    youtubeApiPresentAtT6: enabled ? state.youtubeApiPresentAtT6 : null,
    youtubeApiWarmupResolvedBeforeT6: enabled ? resolvedBeforeT6 : null,
    youtubeApiWarmupLeadBeforePlayerCommitMs: enabled ? leadBeforeCommit : null,
    youtubeChildMountDeferredForWarmup: enabled
      ? state.childMountDeferred
      : false,
    youtubeChildMountDeferredAtMs: enabled
      ? state.childMountDeferredAtMs
      : null,
    youtubeChildMountReleasedAtMs: enabled
      ? state.childMountReleasedAtMs
      : null,
    youtubeChildMountDeferredDurationMs:
      enabled &&
      state.childMountDeferredAtMs != null &&
      state.childMountReleasedAtMs != null
        ? state.childMountReleasedAtMs - state.childMountDeferredAtMs
        : null,
    youtubeChildMountFallbackReason: enabled
      ? state.childMountFallbackReason
      : null,
    youtubeApiPresentAtReactYoutubeMount: enabled
      ? state.apiPresentAtReactYoutubeMount
      : null,
  };
}

export function applyTvYoutubeApiWarmupToSummary(
  summary: {
    segmentDiagnostics: string[];
  } & Partial<TvYoutubeApiWarmupSummaryFields>,
  t6Mark?: number | null,
  playerCommitMs?: number | null
): void {
  if (!isTvEarlyYoutubeApiWarmupEnabled()) {
    summary.earlyYoutubeApiWarmupEnabled = false;
    summary.earlyYoutubeApiWarmupOutcome = "disabled";
    return;
  }

  const fields = buildTvYoutubeApiWarmupSummaryFields(t6Mark, playerCommitMs);
  Object.assign(summary, fields);

  const apiCount =
    (summary as { youtubeApiResourceCount?: number }).youtubeApiResourceCount ??
    0;
  if (apiCount > 1) {
    markWarmupFallbackDuplicateApiResource();
    if (
      !summary.segmentDiagnostics.includes(
        "warmup_fallback_duplicate_api_resource"
      )
    ) {
      summary.segmentDiagnostics.push("warmup_fallback_duplicate_api_resource");
    }
  }

  if (state.warmupFallbackDuplicateApiResource) {
    if (
      !summary.segmentDiagnostics.includes(
        "warmup_fallback_duplicate_api_resource"
      )
    ) {
      summary.segmentDiagnostics.push("warmup_fallback_duplicate_api_resource");
    }
  }
}

export function resetTvYoutubeApiWarmupForNavigation(): void {
  state = createInitialState();
}

export function __getTvYoutubeApiWarmupStateForTest(): WarmupState {
  return state;
}

export function __resetTvYoutubeApiWarmupForTest(): void {
  state = createInitialState();
}
