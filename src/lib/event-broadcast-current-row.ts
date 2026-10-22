import type { EventBroadcastRow } from "@/lib/event-broadcast-client";

export type EventBroadcastCurrentApiPayload = {
  broadcast?: EventBroadcastRow | null;
  terminal?: { id: string; recordedStopReason: string | null } | null;
};

/** Active broadcast always wins over a recent terminal summary (race-safe UI). */
export function resolveEventBroadcastCurrentRow(
  payload: EventBroadcastCurrentApiPayload
): EventBroadcastRow | null {
  if (payload.broadcast) {
    return payload.broadcast;
  }
  if (!payload.terminal) {
    return null;
  }
  return {
    id: payload.terminal.id,
    ownerHostId: "",
    phase: "stopped",
    billableEndedAt: null,
    recordedStopReason: payload.terminal.recordedStopReason,
    eventChannelId: null,
    initiatedByUserId: null,
    initiatedByRole: null,
    providerIngestActive: false,
    dailyRoomReady: false,
    youtubeBroadcastPrepared: false,
    liveStartedAt: null,
    updatedAt: new Date().toISOString(),
  };
}
