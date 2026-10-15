/**
 * LIVE-009 — event-room native broadcast HTTP client.
 * Real provider UX remains gated by E1-FA / LIVE-008; public starts stay off.
 */

import { getAuthToken } from "@/lib/getAuthToken";

export type EventBroadcastPhase =
  | "preflight"
  | "starting"
  | "live"
  | "interrupted"
  | "stopped";

export type EventBroadcastRow = {
  id: string;
  ownerHostId: string;
  phase: EventBroadcastPhase;
  billableEndedAt: string | null;
  recordedStopReason: string | null;
  eventChannelId: string | null;
  initiatedByUserId: string | null;
  initiatedByRole: string | null;
  providerIngestActive: boolean;
  dailyRoomReady: boolean;
  youtubeBroadcastPrepared: boolean;
  liveStartedAt: string | null;
  updatedAt: string;
};

export type NativeActivationResult = {
  activated: boolean;
  reason?: string;
};

function apiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";
  return base.replace(/\/$/, "");
}

export function broadcastAuthHeader(): string | null {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : null;
}

function authHeaders(authHeader: string): HeadersInit {
  return {
    Authorization: authHeader,
    "Content-Type": "application/json",
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    throw new Error(
      body.code ?? body.message ?? `broadcast_http_${res.status}`
    );
  }
  return (await res.json()) as T;
}

export async function fetchCurrentEventBroadcast(
  eventId: string,
  authHeader: string
): Promise<EventBroadcastRow | null> {
  const base = apiBase();
  if (!base) return null;
  const res = await fetch(`${base}/events/${eventId}/broadcasts/current`, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  const json = await parseJson<{ broadcast: EventBroadcastRow | null }>(res);
  return json.broadcast ?? null;
}

export async function createEventBroadcastIntent(
  eventId: string,
  authHeader: string,
  input: { idempotencyKey: string; eventChannelId?: string }
): Promise<{ broadcastId: string; created: boolean }> {
  const base = apiBase();
  const res = await fetch(`${base}/events/${eventId}/broadcasts`, {
    method: "POST",
    headers: authHeaders(authHeader),
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function activateNativeStreamingWallet(
  eventId: string,
  authHeader: string
): Promise<NativeActivationResult> {
  const base = apiBase();
  const res = await fetch(
    `${base}/events/${eventId}/broadcasts/native-activation`,
    {
      method: "POST",
      headers: authHeaders(authHeader),
      body: JSON.stringify({}),
    }
  );
  return parseJson(res);
}

export type PublisherSessionResult = {
  lease: {
    expiresAt: string;
    generation: number;
    deviceSessionId: string;
    renewed: boolean;
  };
  dailyPublisher: {
    roomName: string;
    roomUrl: string;
    meetingToken: string;
    tokenExpiresAt: string;
  } | null;
  rtmpIngestConfigured: boolean;
};

const DEVICE_SESSION_STORAGE_KEY = "tm_native_broadcast_device_session";

/** Stable per-browser device id for publisher slot enforcement. */
export function getNativeBroadcastDeviceSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(DEVICE_SESSION_STORAGE_KEY);
    if (existing?.trim()) return existing.trim();
    const created = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export async function issueEventBroadcastPublisherSession(
  eventId: string,
  broadcastId: string,
  authHeader: string,
  deviceSessionId: string
): Promise<PublisherSessionResult> {
  const base = apiBase();
  const res = await fetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/publisher-session`,
    {
      method: "POST",
      headers: authHeaders(authHeader),
      body: JSON.stringify({ deviceSessionId }),
    }
  );
  return parseJson(res);
}

export async function preflightEventBroadcast(
  eventId: string,
  broadcastId: string,
  authHeader: string,
  operationKey: string
): Promise<Record<string, unknown>> {
  const base = apiBase();
  const res = await fetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/preflight`,
    {
      method: "POST",
      headers: authHeaders(authHeader),
      body: JSON.stringify({ operationKey }),
    }
  );
  return parseJson(res);
}

export async function startEventBroadcast(
  eventId: string,
  broadcastId: string,
  authHeader: string,
  idempotencyKey: string
): Promise<{
  operationId: string;
  accepted: boolean;
  phase: EventBroadcastPhase;
}> {
  const base = apiBase();
  const res = await fetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/start`,
    {
      method: "POST",
      headers: authHeaders(authHeader),
      body: JSON.stringify({ idempotencyKey }),
    }
  );
  return parseJson(res);
}

export async function stopEventBroadcast(
  eventId: string,
  broadcastId: string,
  authHeader: string,
  input: { idempotencyKey: string; reason: string }
): Promise<Record<string, unknown>> {
  const base = apiBase();
  const res = await fetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/stop`,
    {
      method: "POST",
      headers: authHeaders(authHeader),
      body: JSON.stringify(input),
    }
  );
  return parseJson(res);
}
