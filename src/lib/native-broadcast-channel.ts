import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

/**
 * Picks the event channel id for native broadcast create-intent.
 * Prefers the native provenance channel (repeat sessions), then the room default, then first linked row.
 */
export function pickNativeBroadcastEventChannelId(
  channels: EventRoomVideoChannel[]
): string | undefined {
  if (channels.length === 0) return undefined;

  const native = channels.find(c => c.mediaSource === "native");
  if (native) return native.id;

  const defaultChannel = channels.find(c => c.isDefault);
  if (defaultChannel) return defaultChannel.id;

  const linked = channels.find(c => c.mediaSource !== "native");
  if (linked) return linked.id;

  return channels[0]?.id;
}
