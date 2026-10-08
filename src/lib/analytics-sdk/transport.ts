import type {
  SdkBatchContext,
  SdkQueuedItem,
  TransportAuth,
  V2IngestAckBody,
} from "./types";
import {
  applyAckAndGetRetry,
  drainPendingQueue,
  markBeaconSent,
  peekPendingQueue,
  restoreUnacked,
} from "./queue";

function backendBase(): string {
  const b = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return b.replace(/\/$/, "");
}

function buildHeaders(auth: TransportAuth): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (auth.token) h.Authorization = `Bearer ${auth.token}`;
  return h;
}

export function parseV2AckBody(json: unknown): V2IngestAckBody | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.accepted !== "number") return null;
  if (!Array.isArray(o.duplicates)) return null;
  if (!Array.isArray(o.rejected)) return null;
  const cardsPersisted =
    typeof o.cardsPersisted === "number" ? o.cardsPersisted : undefined;
  return {
    accepted: o.accepted,
    duplicates: o.duplicates.filter((d): d is string => typeof d === "string"),
    rejected: o.rejected.filter(
      (r): r is { index: number; reason: string } =>
        !!r &&
        typeof r === "object" &&
        typeof (r as { index?: unknown }).index === "number" &&
        typeof (r as { reason?: unknown }).reason === "string"
    ),
    ...(cardsPersisted !== undefined ? { cardsPersisted } : {}),
  };
}

export type FlushSdkOptions = {
  ctx: SdkBatchContext;
  auth: TransportAuth;
  fetchImpl?: typeof fetch;
};

function buildBatchBody(
  ctx: SdkBatchContext,
  auth: TransportAuth,
  batch: SdkQueuedItem[]
): Record<string, unknown> {
  return {
    v: 2 as const,
    sessionId: ctx.sessionId,
    surface: ctx.surface,
    ...(ctx.eventId ? { eventId: ctx.eventId } : {}),
    ...(ctx.deviceCategory ? { deviceCategory: ctx.deviceCategory } : {}),
    ...((auth.visitorId ?? ctx.visitorId)
      ? { visitorId: auth.visitorId ?? ctx.visitorId }
      : {}),
    ...(ctx.videoChannelId ? { videoChannelId: ctx.videoChannelId } : {}),
    ...(ctx.communityId ? { communityId: ctx.communityId } : {}),
    events: batch,
  };
}

/** POST v:2 batch; require res.ok; apply ack to queue semantics. */
export async function flushSdkAnalytics(
  options: FlushSdkOptions
): Promise<void> {
  const batch = drainPendingQueue();
  if (batch.length === 0) return;

  const url = `${backendBase()}/tv/analytics`;
  const body = buildBatchBody(options.ctx, options.auth, batch);

  const fetchFn = options.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchFn(url, {
      method: "POST",
      headers: buildHeaders(options.auth),
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    restoreUnacked(batch);
    return;
  }

  if (!res.ok) {
    restoreUnacked(batch);
    return;
  }

  let ack: V2IngestAckBody | null = null;
  try {
    ack = parseV2AckBody(await res.json());
  } catch {
    restoreUnacked(batch);
    return;
  }

  if (!ack) {
    restoreUnacked(batch);
    return;
  }

  const retry = applyAckAndGetRetry(batch, ack);
  if (retry.length > 0) {
    restoreUnacked(retry);
  }
}

export type BeaconSdkOptions = FlushSdkOptions;

/** Best-effort beacon — queue kept until fetch ack (duplicate-safe). */
export function sendSdkBeacon(options: BeaconSdkOptions): boolean {
  const batch = peekPendingQueue();
  if (batch.length === 0) return false;
  if (typeof navigator === "undefined" || !navigator.sendBeacon) {
    return false;
  }

  const url = `${backendBase()}/tv/analytics`;
  const body = JSON.stringify(buildBatchBody(options.ctx, options.auth, batch));

  try {
    const ok = navigator.sendBeacon(
      url,
      new Blob([body], { type: "application/json" })
    );
    if (!ok) return false;
    markBeaconSent(batch.map(e => e.eventUid));
    return true;
  } catch {
    return false;
  }
}
