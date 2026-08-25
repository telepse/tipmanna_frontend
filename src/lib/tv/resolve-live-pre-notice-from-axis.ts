import {
  resolveBroadcastPosition,
  type ScheduleItem,
} from "@/lib/tv/broadcastResolver";

export type LivePreNotice = {
  enforcementId: string;
  title: string;
  scheduleIndex: number;
  remainingSec: number;
};

function noticeEndSec(item: ScheduleItem): number {
  if (typeof item.axisEndSec === "number" && Number.isFinite(item.axisEndSec)) {
    return item.axisEndSec;
  }
  const start = item.axisStartSec ?? 0;
  return start + (item.duration > 0 ? item.duration : 60);
}

/**
 * When live axis is on a pre-notice slate, returns countdown metadata for the shared overlay.
 */
export function resolveLivePreNoticeFromAxis(
  items: ScheduleItem[],
  broadcastEpoch: number | null,
  totalDuration: number,
  now: number
): LivePreNotice | null {
  if (!broadcastEpoch || !items.length || !totalDuration) return null;

  const pos = resolveBroadcastPosition(
    items,
    broadcastEpoch,
    totalDuration,
    now
  );
  const item = pos.item;
  if (!item || item.segmentKind !== "notice" || item.noticePhase === "post") {
    return null;
  }

  const enforcementId = item.enforcementId?.trim();
  if (!enforcementId) return null;

  const endSec = noticeEndSec(item);
  const remainingSec = Math.max(0, Math.ceil(endSec - pos.loopPosition));

  return {
    enforcementId,
    title: item.channel?.title?.trim() || "Program notice",
    scheduleIndex: pos.scheduleIndex,
    remainingSec,
  };
}
