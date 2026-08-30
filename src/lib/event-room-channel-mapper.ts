import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

/** Map create-channel API row to event-room picker shape. */
export function mapApiChannelToEventRoomRow(
  row: unknown
): EventRoomVideoChannel | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = r.id != null ? String(r.id) : "";
  const url = typeof r.url === "string" ? r.url : "";
  if (!id || !url) return null;
  return {
    id,
    url,
    title: typeof r.title === "string" ? r.title : undefined,
    isDefault: r.isDefault === true,
    durationSeconds:
      typeof r.durationSeconds === "number" ? r.durationSeconds : undefined,
  };
}
