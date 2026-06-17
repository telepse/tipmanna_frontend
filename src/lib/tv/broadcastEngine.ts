import {
  resolveBroadcastPosition,
  type BroadcastPosition,
  type ScheduleItem,
} from "@/lib/tv/broadcastResolver";

export {
  resolveBroadcastPosition,
  type BroadcastPosition,
  type ScheduleItem,
};

/** Single call site for “which row is live now” (no player side effects). */
export function getLiveScheduleIndex(
  items: Parameters<typeof resolveBroadcastPosition>[0],
  broadcastEpoch: number,
  totalDuration: number,
  nowMs: number
): number | null {
  const pos = resolveBroadcastPosition(
    items,
    broadcastEpoch,
    totalDuration,
    nowMs
  );
  if (!pos.item) return null;
  return pos.scheduleIndex;
}
