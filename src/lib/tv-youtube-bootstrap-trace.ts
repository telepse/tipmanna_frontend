/**
 * Phase C2.0 — YouTube bootstrap trace decomposition (observational only).
 *
 * Requires startup trace enabled and NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE=1.
 * Never changes player, loader, or network behavior.
 */

import { isTvStartupTraceFlagEnabled } from "./tv-feature-flags";
import {
  extractYoutubeApiConnectionTiming,
  getTvSsrYoutubePreconnectOrigins,
  isTvSsrYoutubePreconnectEnabled,
  type YoutubeApiConnectionTimingFields,
} from "./tv-youtube-preconnect-config";

export type YoutubePathCategory =
  | "iframe_api"
  | "widget_api"
  | "youtube_embed_document"
  | "youtube_nocookie_embed_document"
  | "youtube_image"
  | "googlevideo_media"
  | "other_youtube";

export type YoutubeHostCategory =
  | "www.youtube.com"
  | "www.youtube-nocookie.com"
  | "i.ytimg.com"
  | "img.youtube.com"
  | "googlevideo.com"
  | "other";

export type YoutubeResourceTimingEntry = {
  hostCategory: YoutubeHostCategory;
  pathCategory: YoutubePathCategory;
  initiatorType: string;
  startTime: number;
  responseStart: number;
  responseEnd: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  timingDetailLevel: "full" | "limited";
  cacheInference:
    | "likely_memory_or_http_cache"
    | "network_or_unknown"
    | "unavailable";
};

export type YoutubeApiDetectionReason =
  | "present_at_player_commit"
  | "present_at_mount_effect"
  | "poll_detected"
  | "ready_callback_without_prior_detection";

export type LooperKind = "desktop" | "mobile";
export type BootstrapSource = "global" | "community";

type BootstrapEventSink = (
  event: string,
  opts?: { data?: Record<string, unknown>; reason?: string }
) => void;

type BootstrapState = {
  traceId: string | null;
  active: boolean;
  stopped: boolean;
  t2Ms: number | null;
  t6Ms: number | null;
  t8Ms: number | null;
  looperCommitMs: number | null;
  looperKind: LooperKind | null;
  playerRenderRequestedMs: number | null;
  playerCommitMs: number | null;
  reactYoutubeContainerCommitMs: number | null;
  playerCreationRequestedMs: number | null;
  apiObjectDetectedMs: number | null;
  iframeInsertedMs: number | null;
  apiResourceStartMs: number | null;
  apiResourceFinishMs: number | null;
  widgetResourceStartMs: number | null;
  widgetResourceFinishMs: number | null;
  embedDocumentStartMs: number | null;
  embedDocumentFinishMs: number | null;
  youtubeApiPresentAtPlayerCommit: boolean | null;
  youtubeApiDetectionReason: YoutubeApiDetectionReason | null;
  apiPollDelayMs: number | null;
  looperCommitCount: number;
  tvPlayerCommitCount: number;
  playerRenderRequestedGeneration: number | null;
  lastPlayerStartupGeneration: number | null;
  youtubeApiResourceCount: number;
  youtubeWidgetResourceCount: number;
  youtubeEmbedDocumentCount: number;
  youtubeIframeInsertionCount: number;
  youtubeDuplicateIframeInsertionCount: number;
  resourceEntries: YoutubeResourceTimingEntry[];
  seenResourceKeys: Set<string>;
  resourceObserver: PerformanceObserver | null;
  longTaskObserver: PerformanceObserver | null;
  longTaskObserverSupported: boolean;
  longTaskCountT2ToT8: number;
  longTaskTotalDurationMsT2ToT8: number;
  longTaskMaxDurationMsT2ToT8: number;
  longTaskCountT6ToT8: number;
  longTaskTotalDurationMsT6ToT8: number;
  longTaskMaxDurationMsT6ToT8: number;
  iframeObserver: MutationObserver | null;
  iframeObserverContainer: Element | null;
  apiObjectDetectedEmitted: boolean;
  playerRenderRequestedForGen: Set<number>;
  apiConnectionTiming: YoutubeApiConnectionTimingFields | null;
};

let cachedBootstrapEnabled: boolean | null = null;
let eventSink: BootstrapEventSink | null = null;
let state: BootstrapState | null = null;

function createState(): BootstrapState {
  return {
    traceId: null,
    active: false,
    stopped: false,
    t2Ms: null,
    t6Ms: null,
    t8Ms: null,
    looperCommitMs: null,
    looperKind: null,
    playerRenderRequestedMs: null,
    playerCommitMs: null,
    reactYoutubeContainerCommitMs: null,
    playerCreationRequestedMs: null,
    apiObjectDetectedMs: null,
    iframeInsertedMs: null,
    apiResourceStartMs: null,
    apiResourceFinishMs: null,
    widgetResourceStartMs: null,
    widgetResourceFinishMs: null,
    embedDocumentStartMs: null,
    embedDocumentFinishMs: null,
    youtubeApiPresentAtPlayerCommit: null,
    youtubeApiDetectionReason: null,
    apiPollDelayMs: null,
    looperCommitCount: 0,
    tvPlayerCommitCount: 0,
    playerRenderRequestedGeneration: null,
    lastPlayerStartupGeneration: null,
    youtubeApiResourceCount: 0,
    youtubeWidgetResourceCount: 0,
    youtubeEmbedDocumentCount: 0,
    youtubeIframeInsertionCount: 0,
    youtubeDuplicateIframeInsertionCount: 0,
    resourceEntries: [],
    seenResourceKeys: new Set(),
    resourceObserver: null,
    longTaskObserver: null,
    longTaskObserverSupported: false,
    longTaskCountT2ToT8: 0,
    longTaskTotalDurationMsT2ToT8: 0,
    longTaskMaxDurationMsT2ToT8: 0,
    longTaskCountT6ToT8: 0,
    longTaskTotalDurationMsT6ToT8: 0,
    longTaskMaxDurationMsT6ToT8: 0,
    iframeObserver: null,
    iframeObserverContainer: null,
    apiObjectDetectedEmitted: false,
    playerRenderRequestedForGen: new Set(),
    apiConnectionTiming: null,
  };
}

export function isTvYoutubeBootstrapTraceEnabled(): boolean {
  if (cachedBootstrapEnabled !== null) return cachedBootstrapEnabled;
  const envVal = process.env.NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE;
  cachedBootstrapEnabled = envVal === "1" || envVal === "true";
  return cachedBootstrapEnabled;
}

function isStartupTraceEnabledForBootstrap(): boolean {
  if (isTvStartupTraceFlagEnabled()) return true;
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("tvDebug");
  } catch {
    return false;
  }
}

/** Active when both startup trace and C2.0 flag are on. */
export function isTvYoutubeBootstrapTraceActive(): boolean {
  return (
    isStartupTraceEnabledForBootstrap() && isTvYoutubeBootstrapTraceEnabled()
  );
}

export function registerYoutubeBootstrapEventSink(
  sink: BootstrapEventSink
): void {
  eventSink = sink;
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

function emitBootstrapEvent(
  event: string,
  opts?: { data?: Record<string, unknown>; reason?: string }
): void {
  if (!isTvYoutubeBootstrapTraceActive() || !state?.active || state.stopped) {
    return;
  }
  try {
    eventSink?.(event, opts);
  } catch {
    /* never break playback */
  }
}

function isYtPlayerPresent(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { YT?: { Player?: unknown } };
  return Boolean(w.YT && w.YT.Player);
}

function parseHostCategory(hostname: string): YoutubeHostCategory | null {
  const host = hostname.toLowerCase();
  if (host === "www.youtube.com" || host === "youtube.com") {
    return "www.youtube.com";
  }
  if (host === "www.youtube-nocookie.com") return "www.youtube-nocookie.com";
  if (host === "i.ytimg.com") return "i.ytimg.com";
  if (host === "img.youtube.com") return "img.youtube.com";
  if (host.endsWith(".googlevideo.com") || host === "googlevideo.com") {
    return "googlevideo.com";
  }
  return null;
}

function classifyPath(
  hostCategory: YoutubeHostCategory,
  pathname: string
): YoutubePathCategory {
  const path = pathname.toLowerCase();
  if (hostCategory === "www.youtube.com") {
    if (path.includes("iframe_api")) return "iframe_api";
    if (path.includes("widgetapi") || path.includes("www-widgetapi")) {
      return "widget_api";
    }
    if (path.includes("/embed/")) return "youtube_embed_document";
    return "other_youtube";
  }
  if (hostCategory === "www.youtube-nocookie.com") {
    if (path.includes("/embed/")) return "youtube_nocookie_embed_document";
    return "other_youtube";
  }
  if (hostCategory === "i.ytimg.com" || hostCategory === "img.youtube.com") {
    return "youtube_image";
  }
  if (hostCategory === "googlevideo.com") return "googlevideo_media";
  return "other_youtube";
}

function normalizeResourceEntry(
  entry: PerformanceResourceTiming
): YoutubeResourceTimingEntry | null {
  let url: URL;
  try {
    url = new URL(entry.name);
  } catch {
    return null;
  }
  const hostCategory = parseHostCategory(url.hostname);
  if (!hostCategory) return null;

  const pathCategory = classifyPath(hostCategory, url.pathname);
  const responseStart = entry.responseStart ?? 0;
  const responseEnd = entry.responseEnd ?? 0;
  const transferSize = entry.transferSize ?? 0;
  const encodedBodySize = entry.encodedBodySize ?? 0;
  const decodedBodySize = entry.decodedBodySize ?? 0;

  const hasTiming =
    responseEnd > 0 &&
    (responseStart > 0 || entry.duration > 0 || transferSize > 0);
  const timingDetailLevel: "full" | "limited" = hasTiming ? "full" : "limited";

  let cacheInference: YoutubeResourceTimingEntry["cacheInference"] =
    "unavailable";
  if (timingDetailLevel === "full") {
    cacheInference =
      transferSize === 0 && encodedBodySize > 0
        ? "likely_memory_or_http_cache"
        : "network_or_unknown";
  }

  return {
    hostCategory,
    pathCategory,
    initiatorType: entry.initiatorType ?? "unknown",
    startTime: entry.startTime,
    responseStart,
    responseEnd,
    duration: entry.duration ?? Math.max(0, responseEnd - entry.startTime),
    transferSize,
    encodedBodySize,
    decodedBodySize,
    timingDetailLevel,
    cacheInference,
  };
}

function resourceKey(entry: PerformanceResourceTiming): string {
  try {
    const url = new URL(entry.name);
    const host = parseHostCategory(url.hostname);
    if (!host) return "";
    const pathCat = classifyPath(host, url.pathname);
    return `${pathCat}:${entry.startTime}:${entry.duration}`;
  } catch {
    return "";
  }
}

function ingestResourceEntry(entry: PerformanceResourceTiming): void {
  if (!state?.active || state.stopped) return;
  const key = resourceKey(entry);
  if (!key || state.seenResourceKeys.has(key)) return;

  const normalized = normalizeResourceEntry(entry);
  if (!normalized) return;

  state.seenResourceKeys.add(key);
  state.resourceEntries.push(normalized);

  const { pathCategory, startTime, responseEnd } = normalized;
  const finishTime = responseEnd > 0 ? responseEnd : startTime;

  if (pathCategory === "iframe_api") {
    state.youtubeApiResourceCount += 1;
    if (state.apiConnectionTiming == null) {
      state.apiConnectionTiming = extractYoutubeApiConnectionTiming(entry);
    }
    if (state.youtubeApiResourceCount > 1) {
      emitBootstrapEvent("duplicate_api_resource", {
        data: { pathCategory, count: state.youtubeApiResourceCount },
      });
    }
    if (state.apiResourceStartMs == null) {
      state.apiResourceStartMs = startTime;
      emitBootstrapEvent("youtube_api_resource_started", {
        data: { elapsedMs: startTime, pathCategory },
      });
    }
    if (state.apiResourceFinishMs == null && responseEnd > 0) {
      state.apiResourceFinishMs = finishTime;
      emitBootstrapEvent("youtube_api_resource_finished", {
        data: { elapsedMs: finishTime, pathCategory },
      });
    }
  } else if (pathCategory === "widget_api") {
    state.youtubeWidgetResourceCount += 1;
    if (state.widgetResourceStartMs == null) {
      state.widgetResourceStartMs = startTime;
      emitBootstrapEvent("youtube_widget_resource_started", {
        data: { elapsedMs: startTime, pathCategory },
      });
    }
    if (state.widgetResourceFinishMs == null && responseEnd > 0) {
      state.widgetResourceFinishMs = finishTime;
      emitBootstrapEvent("youtube_widget_resource_finished", {
        data: { elapsedMs: finishTime, pathCategory },
      });
    }
  } else if (
    pathCategory === "youtube_embed_document" ||
    pathCategory === "youtube_nocookie_embed_document"
  ) {
    state.youtubeEmbedDocumentCount += 1;
    if (state.embedDocumentStartMs == null) {
      state.embedDocumentStartMs = startTime;
      emitBootstrapEvent("youtube_embed_document_started", {
        data: { elapsedMs: startTime, pathCategory },
      });
    }
    if (state.embedDocumentFinishMs == null && responseEnd > 0) {
      state.embedDocumentFinishMs = finishTime;
      emitBootstrapEvent("youtube_embed_document_finished", {
        data: { elapsedMs: finishTime, pathCategory },
      });
    }
  }
}

function scanExistingResources(): void {
  if (typeof performance === "undefined") return;
  try {
    const entries = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];
    for (const entry of entries) {
      ingestResourceEntry(entry);
    }
  } catch {
    /* ignore */
  }
}

function recordLongTask(entry: PerformanceEntry): void {
  if (!state?.active || state.stopped) return;
  const duration = entry.duration ?? 0;
  if (duration <= 0) return;
  const start = entry.startTime ?? 0;
  const t8 = state.t8Ms;

  if (t8 != null && start > t8) return;

  state.longTaskCountT2ToT8 += 1;
  state.longTaskTotalDurationMsT2ToT8 += duration;
  state.longTaskMaxDurationMsT2ToT8 = Math.max(
    state.longTaskMaxDurationMsT2ToT8,
    duration
  );

  const t6 = state.t6Ms;
  if (t6 != null && start >= t6) {
    state.longTaskCountT6ToT8 += 1;
    state.longTaskTotalDurationMsT6ToT8 += duration;
    state.longTaskMaxDurationMsT6ToT8 = Math.max(
      state.longTaskMaxDurationMsT6ToT8,
      duration
    );
  }
}

function startObservers(): void {
  if (!state?.active || state.stopped) return;

  scanExistingResources();

  if (
    typeof window === "undefined" ||
    typeof PerformanceObserver === "undefined"
  ) {
    return;
  }

  try {
    state.resourceObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "resource") {
          ingestResourceEntry(entry as PerformanceResourceTiming);
        }
      }
    });
    state.resourceObserver.observe({
      type: "resource",
      buffered: true,
    } as PerformanceObserverInit);
  } catch {
    state.resourceObserver = null;
  }

  try {
    state.longTaskObserverSupported =
      PerformanceObserver.supportedEntryTypes?.includes("longtask");
    if (state.longTaskObserverSupported) {
      state.longTaskObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          recordLongTask(entry);
        }
      });
      state.longTaskObserver.observe({
        type: "longtask",
        buffered: true,
      } as PerformanceObserverInit);
    }
  } catch {
    state.longTaskObserverSupported = false;
    state.longTaskObserver = null;
  }
}

function stopObservers(): void {
  if (!state) return;
  try {
    state.resourceObserver?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    state.longTaskObserver?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    state.iframeObserver?.disconnect();
  } catch {
    /* ignore */
  }
  state.resourceObserver = null;
  state.longTaskObserver = null;
  state.iframeObserver = null;
  state.iframeObserverContainer = null;
}

export function initYoutubeBootstrapTrace(traceId: string): void {
  if (!isTvYoutubeBootstrapTraceActive()) return;
  resetYoutubeBootstrapTrace();
  state = createState();
  state.traceId = traceId;
  state.active = true;
  startObservers();
}

export function resetYoutubeBootstrapTrace(): void {
  stopObservers();
  state = null;
}

export function __resetYoutubeBootstrapCacheForTest(): void {
  cachedBootstrapEnabled = null;
}

export function notifyBootstrapT2(): void {
  if (!state?.active || state.stopped) return;
  state.t2Ms = nowMs();
}

export function notifyBootstrapT6(elapsedMs: number): void {
  if (!state?.active || state.stopped) return;
  state.t6Ms = elapsedMs;
}

export function notifyBootstrapT8(elapsedMs: number): void {
  if (!state?.active || state.stopped) return;
  state.t8Ms = elapsedMs;
  flushResourcesBeforeT8();
  stopYoutubeBootstrapTrace();
}

export function stopYoutubeBootstrapTrace(): void {
  if (!state) return;
  state.stopped = true;
  flushResourcesBeforeT8();
  stopObservers();
}

function flushResourcesBeforeT8(): void {
  if (!state?.active) return;
  scanExistingResources();
}

function rejectStaleGeneration(
  startupGeneration: number | undefined,
  traceId: string | null
): boolean {
  if (!state?.active || state.stopped) return true;
  if (traceId && state.traceId && traceId !== state.traceId) return true;
  if (
    startupGeneration != null &&
    state.lastPlayerStartupGeneration != null &&
    startupGeneration < state.lastPlayerStartupGeneration
  ) {
    return true;
  }
  return false;
}

export function recordLooperCommitted(opts: {
  looperKind: LooperKind;
  source: BootstrapSource;
  startupGeneration: number;
  traceId?: string | null;
}): void {
  if (!isTvYoutubeBootstrapTraceActive()) return;
  if (!state?.active || state.stopped) return;
  if (rejectStaleGeneration(opts.startupGeneration, opts.traceId ?? null))
    return;

  state.looperCommitCount += 1;
  const at = nowMs();
  if (state.looperCommitMs == null) {
    state.looperCommitMs = at;
  }
  state.looperKind = opts.looperKind;
  state.lastPlayerStartupGeneration = opts.startupGeneration;

  emitBootstrapEvent("tv_looper_committed", {
    data: {
      looperKind: opts.looperKind,
      source: opts.source,
      startupGeneration: opts.startupGeneration,
      looperCommitCount: state.looperCommitCount,
      elapsedMs: at,
    },
  });
}

export function recordPlayerRenderRequested(opts: {
  startupGeneration: number;
  source: BootstrapSource;
  selectedIndex: number;
  hasPlaybackUrl: boolean;
  traceId?: string | null;
}): void {
  if (!isTvYoutubeBootstrapTraceActive()) return;
  if (!state?.active || state.stopped) return;
  if (rejectStaleGeneration(opts.startupGeneration, opts.traceId ?? null))
    return;
  if (state.playerRenderRequestedForGen.has(opts.startupGeneration)) return;

  state.playerRenderRequestedForGen.add(opts.startupGeneration);
  const at = nowMs();
  if (state.playerRenderRequestedMs == null) {
    state.playerRenderRequestedMs = at;
  }
  state.lastPlayerStartupGeneration = opts.startupGeneration;

  emitBootstrapEvent("tv_player_render_requested", {
    data: {
      startupGeneration: opts.startupGeneration,
      source: opts.source,
      selectedIndex: opts.selectedIndex,
      hasPlaybackUrl: opts.hasPlaybackUrl,
      elapsedMs: at,
    },
  });
}

export function recordPlayerCommitted(opts: {
  startupGeneration: number;
  source: BootstrapSource;
  traceId?: string | null;
}): {
  youtubeApiPresentAtCommit: boolean;
  youtubePlayerConstructorPresentAtCommit: boolean;
} {
  const apiPresent = isYtPlayerPresent();
  const constructorPresent = apiPresent;

  if (!isTvYoutubeBootstrapTraceActive()) {
    return {
      youtubeApiPresentAtCommit: apiPresent,
      youtubePlayerConstructorPresentAtCommit: constructorPresent,
    };
  }
  if (!state?.active || state.stopped) {
    return {
      youtubeApiPresentAtCommit: apiPresent,
      youtubePlayerConstructorPresentAtCommit: constructorPresent,
    };
  }
  if (rejectStaleGeneration(opts.startupGeneration, opts.traceId ?? null)) {
    return {
      youtubeApiPresentAtCommit: apiPresent,
      youtubePlayerConstructorPresentAtCommit: constructorPresent,
    };
  }

  state.tvPlayerCommitCount += 1;
  const at = nowMs();
  if (state.playerCommitMs == null) {
    state.playerCommitMs = at;
    state.youtubeApiPresentAtPlayerCommit = apiPresent;
    if (apiPresent) {
      recordApiObjectDetected({
        detectionReason: "present_at_player_commit",
        pollDelayMs: 0,
        apiAlreadyPresent: true,
        startupGeneration: opts.startupGeneration,
        traceId: opts.traceId,
      });
    }
  }
  state.lastPlayerStartupGeneration = opts.startupGeneration;

  emitBootstrapEvent("tv_player_committed", {
    data: {
      startupGeneration: opts.startupGeneration,
      source: opts.source,
      youtubeApiPresentAtCommit: apiPresent,
      youtubePlayerConstructorPresentAtCommit: constructorPresent,
      tvPlayerCommitCount: state.tvPlayerCommitCount,
      elapsedMs: at,
    },
  });

  return {
    youtubeApiPresentAtCommit: apiPresent,
    youtubePlayerConstructorPresentAtCommit: constructorPresent,
  };
}

export function recordReactYoutubeContainerCommitted(opts: {
  startupGeneration: number;
  source: BootstrapSource;
  traceId?: string | null;
}): void {
  if (!isTvYoutubeBootstrapTraceActive()) return;
  if (!state?.active || state.stopped) return;
  if (rejectStaleGeneration(opts.startupGeneration, opts.traceId ?? null))
    return;

  const at = nowMs();
  if (state.reactYoutubeContainerCommitMs == null) {
    state.reactYoutubeContainerCommitMs = at;
  }
  if (state.playerCreationRequestedMs == null) {
    state.playerCreationRequestedMs = at;
    emitBootstrapEvent("youtube_player_creation_requested", {
      reason: "react_youtube_mount_committed",
      data: {
        startupGeneration: opts.startupGeneration,
        source: opts.source,
        elapsedMs: at,
        note: "request_boundary_not_constructor_proof",
      },
    });
  }

  emitBootstrapEvent("react_youtube_container_committed", {
    data: {
      startupGeneration: opts.startupGeneration,
      source: opts.source,
      elapsedMs: at,
    },
  });
}

export function recordApiObjectDetected(opts: {
  detectionReason: YoutubeApiDetectionReason;
  pollDelayMs?: number;
  apiAlreadyPresent: boolean;
  startupGeneration?: number;
  traceId?: string | null;
}): void {
  if (!isTvYoutubeBootstrapTraceActive()) return;
  if (!state?.active || state.stopped) return;
  if (
    opts.startupGeneration != null &&
    rejectStaleGeneration(opts.startupGeneration, opts.traceId ?? null)
  ) {
    return;
  }
  if (state.apiObjectDetectedEmitted) return;

  state.apiObjectDetectedEmitted = true;
  const at = nowMs();
  state.apiObjectDetectedMs = at;
  state.youtubeApiDetectionReason = opts.detectionReason;
  if (opts.pollDelayMs != null) {
    state.apiPollDelayMs = opts.pollDelayMs;
  }

  emitBootstrapEvent("youtube_api_object_detected", {
    reason: opts.detectionReason,
    data: {
      detectionReason: opts.detectionReason,
      pollDelayMs: opts.pollDelayMs ?? null,
      apiAlreadyPresent: opts.apiAlreadyPresent,
      elapsedMs: at,
    },
  });
}

export function ensureApiObjectDetectedAtReady(opts: {
  startupGeneration?: number;
  traceId?: string | null;
}): void {
  if (!isTvYoutubeBootstrapTraceActive()) return;
  if (!state?.active || state.stopped) return;
  if (state.apiObjectDetectedEmitted) return;
  recordApiObjectDetected({
    detectionReason: "ready_callback_without_prior_detection",
    apiAlreadyPresent: isYtPlayerPresent(),
    startupGeneration: opts.startupGeneration,
    traceId: opts.traceId,
  });
}

export function attachIframeInsertionObserver(opts: {
  container: Element;
  startupGeneration: number;
  source: BootstrapSource;
  traceId?: string | null;
}): void {
  if (!isTvYoutubeBootstrapTraceActive()) return;
  if (!state?.active || state.stopped) return;
  if (rejectStaleGeneration(opts.startupGeneration, opts.traceId ?? null))
    return;
  if (typeof MutationObserver === "undefined") return;

  try {
    state.iframeObserver?.disconnect();
  } catch {
    /* ignore */
  }

  state.iframeObserverContainer = opts.container;

  const countIframes = () => opts.container.querySelectorAll("iframe").length;

  const emitInsertion = (duplicate: boolean) => {
    const at = nowMs();
    const playerCommit = state!.playerCommitMs;
    state!.youtubeIframeInsertionCount += 1;
    if (duplicate) {
      state!.youtubeDuplicateIframeInsertionCount += 1;
      emitBootstrapEvent("duplicate_iframe_insertion", {
        data: {
          startupGeneration: opts.startupGeneration,
          source: opts.source,
          iframeCountInContainer: countIframes(),
          duplicateCount: state!.youtubeDuplicateIframeInsertionCount,
        },
      });
    }
    if (state!.iframeInsertedMs == null && !duplicate) {
      state!.iframeInsertedMs = at;
      emitBootstrapEvent("youtube_iframe_inserted", {
        data: {
          startupGeneration: opts.startupGeneration,
          source: opts.source,
          iframeCountInContainer: countIframes(),
          elapsedSincePlayerCommitMs:
            playerCommit != null ? at - playerCommit : null,
          elapsedMs: at,
        },
      });
      try {
        state!.iframeObserver?.disconnect();
      } catch {
        /* ignore */
      }
      state!.iframeObserver = null;
    }
  };

  if (countIframes() > 0) {
    emitInsertion(false);
    return;
  }

  state.iframeObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        const el = node as Element;
        if (typeof el !== "object" || el === null || !("tagName" in el)) {
          continue;
        }
        if (el.tagName === "IFRAME" || el.querySelector?.("iframe")) {
          const isFirst = state!.iframeInsertedMs == null;
          emitInsertion(!isFirst);
          return;
        }
      }
    }
  });

  state.iframeObserver.observe(opts.container, {
    childList: true,
    subtree: true,
  });
}

function segment(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  const delta = b - a;
  return delta >= 0 ? delta : null;
}

function worstTimingDetailLevel(
  entries: YoutubeResourceTimingEntry[]
): "full" | "limited" | null {
  if (entries.length === 0) return null;
  return entries.some(e => e.timingDetailLevel === "limited")
    ? "limited"
    : "full";
}

export type YoutubeBootstrapSummaryFields = {
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

export function computeBootstrapDiagnostics(
  fields: YoutubeBootstrapSummaryFields
): string[] {
  const d: string[] = [];
  const apiPresent = fields.youtubeApiPresentAtPlayerCommit === true;

  if (fields.tvPlayerCommitCount === 0) {
    d.push("player_commit_missing");
  }
  if (
    fields.youtubeApiResourceCount === 0 &&
    !apiPresent &&
    fields.T6_toPlayerCommitMs != null
  ) {
    d.push("api_resource_start_missing");
  }
  if (
    fields.youtubeApiResourceCount > 0 &&
    fields.apiResourceStartToFinishMs == null &&
    !apiPresent
  ) {
    d.push("api_resource_finish_missing");
  }
  if (
    fields.playerCommitToApiResourceStartMs != null &&
    fields.playerCommitToApiObjectDetectedMs != null &&
    fields.playerCommitToApiObjectDetectedMs <
      fields.playerCommitToApiResourceStartMs &&
    !apiPresent
  ) {
    d.push("api_object_detected_before_resource_start");
  }
  if (
    fields.apiObjectDetectedToIframeInsertedMs != null &&
    fields.apiObjectDetectedToIframeInsertedMs < 0 &&
    !apiPresent
  ) {
    d.push("iframe_inserted_before_api_object_detected");
  }
  if (
    fields.iframeInsertedToT8Ms == null &&
    fields.T6_toPlayerCommitMs != null &&
    fields.youtubeIframeInsertionCount === 0
  ) {
    d.push("iframe_inserted_missing_before_T8");
  }
  if (fields.youtubeApiResourceCount > 1) {
    d.push("duplicate_api_resource");
  }
  if (fields.youtubeDuplicateIframeInsertionCount > 0) {
    d.push("duplicate_iframe_insertion");
  }
  if (fields.longTaskCountT6ToT8 > 0) {
    d.push("long_task_overlap_T6_T8");
  }
  return d;
}

export function buildYoutubeBootstrapSummaryFields(
  t6Mark: number | null | undefined,
  t8Mark: number | null | undefined
): YoutubeBootstrapSummaryFields {
  const s = state;
  const t6 = t6Mark ?? s?.t6Ms ?? null;
  const t8 = t8Mark ?? s?.t8Ms ?? null;

  const looperCommit = s?.looperCommitMs ?? null;
  const playerRender = s?.playerRenderRequestedMs ?? null;
  const playerCommit = s?.playerCommitMs ?? null;
  const apiStart = s?.apiResourceStartMs ?? null;
  const apiFinish = s?.apiResourceFinishMs ?? null;
  const apiObject = s?.apiObjectDetectedMs ?? null;
  const iframeInserted = s?.iframeInsertedMs ?? null;

  const fields: YoutubeBootstrapSummaryFields = {
    T6_toLooperCommitMs: segment(t6, looperCommit),
    T6_toPlayerRenderRequestedMs: segment(t6, playerRender),
    T6_toPlayerCommitMs: segment(t6, playerCommit),
    playerCommitToApiResourceStartMs: segment(playerCommit, apiStart),
    apiResourceStartToFinishMs: segment(apiStart, apiFinish),
    apiResourceFinishToObjectDetectedMs: segment(apiFinish, apiObject),
    playerCommitToApiObjectDetectedMs: segment(playerCommit, apiObject),
    playerCommitToIframeInsertedMs: segment(playerCommit, iframeInserted),
    apiObjectDetectedToIframeInsertedMs: segment(apiObject, iframeInserted),
    iframeInsertedToT8Ms: segment(iframeInserted, t8),
    playerCommitToT8Ms: segment(playerCommit, t8),
    youtubeApiPresentAtPlayerCommit: s?.youtubeApiPresentAtPlayerCommit ?? null,
    youtubeApiDetectionReason: s?.youtubeApiDetectionReason ?? null,
    youtubeResourceTimingDetailLevel: s
      ? worstTimingDetailLevel(s.resourceEntries)
      : null,
    youtubeApiResourceCount: s?.youtubeApiResourceCount ?? 0,
    youtubeWidgetResourceCount: s?.youtubeWidgetResourceCount ?? 0,
    youtubeEmbedDocumentCount: s?.youtubeEmbedDocumentCount ?? 0,
    youtubeIframeInsertionCount: s?.youtubeIframeInsertionCount ?? 0,
    youtubeDuplicateIframeInsertionCount:
      s?.youtubeDuplicateIframeInsertionCount ?? 0,
    looperKind: s?.looperKind ?? null,
    looperCommitCount: s?.looperCommitCount ?? 0,
    tvPlayerCommitCount: s?.tvPlayerCommitCount ?? 0,
    longTaskObserverSupported: s?.longTaskObserverSupported ?? false,
    longTaskCountT2ToT8: s?.longTaskCountT2ToT8 ?? 0,
    longTaskTotalDurationMsT2ToT8: s?.longTaskTotalDurationMsT2ToT8 ?? 0,
    longTaskMaxDurationMsT2ToT8: s?.longTaskMaxDurationMsT2ToT8 ?? 0,
    longTaskCountT6ToT8: s?.longTaskCountT6ToT8 ?? 0,
    longTaskTotalDurationMsT6ToT8: s?.longTaskTotalDurationMsT6ToT8 ?? 0,
    longTaskMaxDurationMsT6ToT8: s?.longTaskMaxDurationMsT6ToT8 ?? 0,
    youtubeApiDnsDurationMs:
      s?.apiConnectionTiming?.youtubeApiDnsDurationMs ?? null,
    youtubeApiConnectDurationMs:
      s?.apiConnectionTiming?.youtubeApiConnectDurationMs ?? null,
    youtubeApiTlsDurationMs:
      s?.apiConnectionTiming?.youtubeApiTlsDurationMs ?? null,
    youtubeApiRequestWaitDurationMs:
      s?.apiConnectionTiming?.youtubeApiRequestWaitDurationMs ?? null,
    youtubeApiResponseDurationMs:
      s?.apiConnectionTiming?.youtubeApiResponseDurationMs ?? null,
    youtubeApiConnectionReusedOrPreconnected:
      s?.apiConnectionTiming?.youtubeApiConnectionReusedOrPreconnected ?? null,
    ssrYoutubePreconnectEnabled: isTvSsrYoutubePreconnectEnabled(),
    ssrYoutubePreconnectOrigins: getTvSsrYoutubePreconnectOrigins(),
  };

  return fields;
}

export function applyYoutubeBootstrapToSummary(
  summary: {
    segments: Record<string, number | null>;
    segmentDiagnostics: string[];
  } & Partial<YoutubeBootstrapSummaryFields>,
  t6Mark?: number | null,
  t8Mark?: number | null
): void {
  if (!isTvYoutubeBootstrapTraceEnabled()) return;

  const fields = buildYoutubeBootstrapSummaryFields(
    t6Mark ?? null,
    t8Mark ?? null
  );
  Object.assign(summary, fields);

  const bootstrapSegments: Record<string, number | null> = {
    T6_looperCommit: fields.T6_toLooperCommitMs,
    T6_playerRenderRequested: fields.T6_toPlayerRenderRequestedMs,
    T6_playerCommit: fields.T6_toPlayerCommitMs,
    playerCommit_apiResourceStart: fields.playerCommitToApiResourceStartMs,
    apiResourceStart_finish: fields.apiResourceStartToFinishMs,
    apiResourceFinish_objectDetected:
      fields.apiResourceFinishToObjectDetectedMs,
    playerCommit_apiObjectDetected: fields.playerCommitToApiObjectDetectedMs,
    playerCommit_iframeInserted: fields.playerCommitToIframeInsertedMs,
    apiObjectDetected_iframeInserted:
      fields.apiObjectDetectedToIframeInsertedMs,
    iframeInserted_T8: fields.iframeInsertedToT8Ms,
    playerCommit_T8: fields.playerCommitToT8Ms,
  };

  for (const [key, val] of Object.entries(bootstrapSegments)) {
    if (val != null && val < 0) {
      summary.segmentDiagnostics.push(`negative_segment_${key}`);
    } else {
      summary.segments[key] = val;
    }
  }

  const diagnostics = computeBootstrapDiagnostics(fields);
  for (const diag of diagnostics) {
    if (!summary.segmentDiagnostics.includes(diag)) {
      summary.segmentDiagnostics.push(diag);
    }
  }
}

/** Test-only helpers */
export function __getYoutubeBootstrapStateForTest(): BootstrapState | null {
  return state;
}

export function __ingestResourceEntryForTest(
  entry: PerformanceResourceTiming
): void {
  ingestResourceEntry(entry);
}

export function __recordLongTaskForTest(entry: PerformanceEntry): void {
  recordLongTask(entry);
}
