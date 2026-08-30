import type { PaymentSurface, TvAnalyticsClipMode } from "./analytics-types";
import { getAnalyticsSessionId, getDeviceCategory } from "./analytics-session";
import type {
  TvAnalyticsBatchBodyV1,
  TvAnalyticsEventV1,
} from "./tvAnalyticsSchema";

const ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_TV_ANALYTICS_ENABLED !== "false";

const FLUSH_INTERVAL_MS = 30_000;
const MAX_QUEUE = 80;

let queue: TvAnalyticsEventV1[] = [];
let listenersBound = false;
let runtimeRefCount = 0;
let flushIntervalId: ReturnType<typeof setInterval> | null = null;

function onVisibilityFlush(): void {
  if (document.visibilityState === "hidden") void flushTvAnalytics();
}

function onPageHideFlush(): void {
  void flushTvAnalytics(true);
}

let authToken: string | null = null;
let analyticsVisitorId: string | null = null;

type TvCtx = {
  eventId: string | null;
  channelId: string | null;
  surface: PaymentSurface;
  communityId: string | null;
};

let ctx: TvCtx = {
  eventId: null,
  channelId: null,
  surface: "unknown",
  communityId: null,
};

export function setTvAnalyticsContext(partial: Partial<TvCtx>): void {
  ctx = { ...ctx, ...partial };
}

/** Sync Redux auth for actor resolution on the analytics ingest endpoint. */
export function setTvAnalyticsAuth(
  token: string | null,
  visitorId?: string | null
): void {
  authToken = token;
  analyticsVisitorId = visitorId ?? null;
}

function backendBase(): string {
  const b = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return b.replace(/\/$/, "");
}

function enqueue(ev: TvAnalyticsEventV1): void {
  if (!ENABLED) return;
  queue.push(ev);
  if (queue.length > MAX_QUEUE) {
    queue.splice(0, queue.length - MAX_QUEUE);
  }
}

function buildHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) {
    h.Authorization = `Bearer ${authToken}`;
  }
  return h;
}

export async function flushTvAnalytics(useBeacon = false): Promise<void> {
  if (!ENABLED || queue.length === 0) return;
  const events = queue;
  queue = [];
  const url = `${backendBase()}/tv/analytics`;
  const body: TvAnalyticsBatchBodyV1 = {
    v: 1,
    sessionId: getAnalyticsSessionId(),
    ...(ctx.eventId ? { eventId: ctx.eventId } : {}),
    surface: ctx.surface,
    deviceCategory: getDeviceCategory(),
    ...(analyticsVisitorId ? { visitorId: analyticsVisitorId } : {}),
    ...(ctx.channelId ? { videoChannelId: ctx.channelId } : {}),
    ...(ctx.communityId ? { communityId: ctx.communityId } : {}),
    events,
  };
  const json = JSON.stringify(body);

  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([json], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } catch {
      queue = [...events, ...queue].slice(-MAX_QUEUE);
    }
    return;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: json,
      keepalive: true,
    });
  } catch {
    queue = [...events, ...queue].slice(-MAX_QUEUE);
  }
}

/** Call from TV/analytics surfaces on mount (client only). Ref-counted. */
export function initTvAnalyticsRuntime(): void {
  if (!ENABLED || typeof window === "undefined") return;

  runtimeRefCount += 1;
  if (listenersBound) return;

  listenersBound = true;
  flushIntervalId = setInterval(() => {
    void flushTvAnalytics();
  }, FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisibilityFlush);
  window.addEventListener("pagehide", onPageHideFlush);
}

/** Tear down flush interval when the last analytics surface unmounts. */
export function shutdownTvAnalyticsRuntime(): void {
  if (!ENABLED || typeof window === "undefined") return;

  runtimeRefCount = Math.max(0, runtimeRefCount - 1);
  if (runtimeRefCount > 0 || !listenersBound) return;

  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
  document.removeEventListener("visibilitychange", onVisibilityFlush);
  window.removeEventListener("pagehide", onPageHideFlush);
  listenersBound = false;
  void flushTvAnalytics(true);
}

export function trackTvModeChange(
  from: TvAnalyticsClipMode,
  to: TvAnalyticsClipMode,
  reason: string | null
): void {
  enqueue({
    event: "mode_change",
    ts: Date.now(),
    from,
    to,
    reason,
  });
  void flushTvAnalytics();
}

export function trackTvUserInteraction(
  kind: "pause" | "seek" | "click" | "play",
  detail: string | null
): void {
  enqueue({
    event: "user_interaction",
    ts: Date.now(),
    kind,
    detail,
  });
}

/**
 * Returns true only the first time in this browser tab for `storageKey`.
 * Use for page-level video encounters so React Strict Mode remount does not double-count.
 */
export function consumeVideoSurfaceEncounterOnce(storageKey: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (sessionStorage.getItem(storageKey)) return false;
    sessionStorage.setItem(storageKey, "1");
    return true;
  } catch {
    return true;
  }
}

/** Fires when a clip enters the queue / becomes the active item (before play). */
export function trackTvVideoEncounter(
  itemId: string,
  opts?: {
    channelId?: string;
    videoDurationSec?: number;
    mode?: TvAnalyticsClipMode;
    scheduleIndex?: number;
  }
): void {
  enqueue({
    event: "video_encounter",
    ts: Date.now(),
    itemId,
    ...(opts?.channelId ? { channelId: opts.channelId } : {}),
    ...(typeof opts?.videoDurationSec === "number"
      ? { videoDurationSec: opts.videoDurationSec }
      : {}),
    ...(opts?.mode ? { mode: opts.mode } : {}),
    ...(typeof opts?.scheduleIndex === "number"
      ? { scheduleIndex: opts.scheduleIndex }
      : {}),
  });
}

export function trackTvVideoStart(
  itemId: string,
  mode: TvAnalyticsClipMode,
  scheduleIndex: number,
  channelId?: string
): void {
  enqueue({
    event: "video_start",
    ts: Date.now(),
    itemId,
    ...(channelId ? { channelId } : {}),
    mode,
    scheduleIndex,
  });
}

export function trackTvVideoEnd(
  itemId: string,
  watchDurationSec: number,
  endReason: "ended" | "interrupted" | "slot_change" | "unknown",
  mode: TvAnalyticsClipMode,
  channelId?: string
): void {
  enqueue({
    event: "video_end",
    ts: Date.now(),
    itemId,
    ...(channelId ? { channelId } : {}),
    watchDurationSec,
    endReason,
    mode,
  });
}

export function trackTvWatchDuration(
  itemId: string,
  watchedSec: number,
  mode: TvAnalyticsClipMode,
  channelId?: string
): void {
  enqueue({
    event: "watch_duration",
    ts: Date.now(),
    itemId,
    ...(channelId ? { channelId } : {}),
    watchedSec,
    mode,
  });
}

let lastShareDedupeChannelKey = "";
let lastShareDedupeAtMs = 0;

export function trackTvShareClick(channelId?: string): void {
  const key = channelId ?? "";
  const now = Date.now();
  if (key === lastShareDedupeChannelKey && now - lastShareDedupeAtMs < 900) {
    return;
  }
  lastShareDedupeChannelKey = key;
  lastShareDedupeAtMs = now;

  enqueue({
    event: "share_click",
    ts: Date.now(),
    ...(channelId ? { channelId } : {}),
  });
  void flushTvAnalytics();
}

export function trackTvSaveClick(channelId?: string): void {
  enqueue({
    event: "save_click",
    ts: Date.now(),
    ...(channelId ? { channelId } : {}),
  });
  void flushTvAnalytics();
}

/** Natural end of clip without seek in this session (client marks seek separately). */
export function trackTvVideoComplete(
  itemId: string,
  opts?: { channelId?: string; mode?: TvAnalyticsClipMode }
): void {
  enqueue({
    event: "video_complete",
    ts: Date.now(),
    itemId,
    ...(opts?.channelId ? { channelId: opts.channelId } : {}),
    ...(opts?.mode ? { mode: opts.mode } : {}),
  });
  void flushTvAnalytics();
}

export function trackTvCommentSubmit(
  channelId?: string,
  transactionId?: string
): void {
  enqueue({
    event: "comment_submit",
    ts: Date.now(),
    ...(channelId ? { channelId } : {}),
    ...(transactionId ? { transactionId } : {}),
  });
  void flushTvAnalytics();
}

export function trackVideoFeatureCardEvent(
  event:
    | "card_impression"
    | "card_mini_expand"
    | "card_max_expand"
    | "overlay_close",
  payload: Record<string, string | number | undefined> & { cardId: string }
): void {
  const hostCh =
    typeof payload.hostSurfaceChannelId === "string" &&
    payload.hostSurfaceChannelId.trim()
      ? payload.hostSurfaceChannelId.trim()
      : undefined;
  const vc =
    typeof payload.videoChannelId === "string" && payload.videoChannelId.trim()
      ? payload.videoChannelId.trim()
      : hostCh;

  enqueue({
    event,
    ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
    cardId: payload.cardId,
    ...(payload.cardSessionId != null &&
    typeof payload.cardSessionId === "string"
      ? { cardSessionId: payload.cardSessionId }
      : {}),
    ...(hostCh ? { hostSurfaceChannelId: hostCh } : {}),
    ...(vc ? { videoChannelId: vc } : {}),
    ...(event === "overlay_close" && typeof payload.openedAtMs === "number"
      ? { openedAtMs: payload.openedAtMs }
      : {}),
    ...(event === "overlay_close" && typeof payload.durationMs === "number"
      ? { durationMs: payload.durationMs }
      : {}),
  } as TvAnalyticsEventV1);
}
