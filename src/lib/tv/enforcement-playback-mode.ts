import {
  resolveBroadcastPosition,
  type ScheduleItem,
} from "@/lib/tv/broadcastResolver";

export type EnforcementPlaybackMode =
  | { kind: "live"; scheduleIndex: number }
  | { kind: "local_schedule"; scheduleIndex: number }
  | { kind: "bootstrap" };

/** Notice or enforcement clip belonging to a program. */
export function belongsToEnforcement(
  item: ScheduleItem | null | undefined,
  enforcementId: string
): boolean {
  if (!item?.enforcementId || item.enforcementId !== enforcementId)
    return false;
  return item.segmentKind === "enforcement" || item.segmentKind === "notice";
}

export function isEnforcementClipItem(
  item: ScheduleItem | null | undefined,
  enforcementId: string
): boolean {
  return Boolean(
    item &&
      item.segmentKind === "enforcement" &&
      item.enforcementId === enforcementId
  );
}

/** Advance past notice slates to the first playable row. */
export function skipNoticeSegments(
  items: ScheduleItem[],
  startIndex: number
): number {
  let idx = Math.max(0, startIndex);
  while (idx < items.length && items[idx]?.segmentKind === "notice") {
    idx += 1;
  }
  return idx < items.length ? idx : startIndex;
}

function findFirstEnforcementRowIndex(
  items: ScheduleItem[],
  enforcementId: string
): number {
  const clipIdx = items.findIndex(i => isEnforcementClipItem(i, enforcementId));
  if (clipIdx >= 0) return clipIdx;
  return items.findIndex(i => belongsToEnforcement(i, enforcementId));
}

export function resolveEnforcementPlaybackMode(
  items: ScheduleItem[],
  enforcementId: string,
  broadcastEpoch: number | null,
  totalDuration: number,
  now: number
): EnforcementPlaybackMode {
  const enfId = enforcementId.trim();
  if (!enfId) return { kind: "bootstrap" };

  if (broadcastEpoch && items.length && totalDuration) {
    const pos = resolveBroadcastPosition(
      items,
      broadcastEpoch,
      totalDuration,
      now
    );
    if (pos.item && belongsToEnforcement(pos.item, enfId)) {
      return { kind: "live", scheduleIndex: pos.scheduleIndex };
    }
  }

  const scheduleIdx = findFirstEnforcementRowIndex(items, enfId);
  if (scheduleIdx >= 0) {
    return {
      kind: "local_schedule",
      scheduleIndex: skipNoticeSegments(items, scheduleIdx),
    };
  }

  return { kind: "bootstrap" };
}
