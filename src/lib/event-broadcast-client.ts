/**
 * LIVE-009 — native broadcast shared types + browser-only helpers.
 * API calls use `@/actions/event-broadcast` (HttpOnly host/cohost cookies).
 */

export type EventBroadcastPhase =
  | "preflight"
  | "starting"
  | "live"
  | "interrupted"
  | "stopped";

export type EventBroadcastTerminal = {
  id: string;
  recordedStopReason: string | null;
  providerExecutionMode: string | null;
  billableEndedAt: string | null;
  lastProviderError: string | null;
};

export type EventBroadcastCurrentPayload = {
  broadcast: EventBroadcastRow | null;
  terminal: EventBroadcastTerminal | null;
};

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
  /** Stamped at Start acceptance — mock vs real worker path (not Render env alone). */
  providerExecutionMode: string | null;
  liveStartedAt: string | null;
  updatedAt: string;
};

export type NativeActivationResult = {
  activated: boolean;
  reason?: string;
};

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
