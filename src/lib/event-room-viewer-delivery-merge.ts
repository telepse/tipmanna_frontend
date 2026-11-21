import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

/** D33: apply default-channel-updated payload (URL + default flag). */
export function mergeDefaultChannelRealtimeUpdate(
  channels: EventRoomVideoChannel[],
  payload: { channelId: string; url?: string }
): EventRoomVideoChannel[] {
  return channels.map(c => {
    const isTarget = String(c.id) === payload.channelId;
    return {
      ...c,
      isDefault: isTarget,
      ...(isTarget && payload.url?.trim()
        ? { url: payload.url.trim() }
        : {}),
    };
  });
}

/** Polling fallback when Pusher is missed — merge by id without dropping unknown rows. */
export function mergePolledEventRoomChannels(
  channels: EventRoomVideoChannel[],
  rows: EventRoomVideoChannel[]
): EventRoomVideoChannel[] {
  const byId = new Map(channels.map(c => [String(c.id), c]));
  for (const row of rows) {
    const existing = byId.get(String(row.id));
    byId.set(String(row.id), existing ? { ...existing, ...row } : row);
  }
  return [...byId.values()];
}
