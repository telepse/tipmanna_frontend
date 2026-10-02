import {
  resolveBroadcastPosition,
  type ScheduleItem,
} from "@/lib/tv/broadcastEngine";

export type ScheduleRefreshLiveTarget = {
  scheduleIndex: number;
  offsetSeconds: number;
  loopPosition: number;
};

export type ScheduleRefreshRevisionSnapshot = {
  scheduleRevision: string | number | null;
  checksum: string | null;
  activeScheduleId: string | null;
  etag: string | null;
};

export function readScheduleRevisionFromPayload(data: {
  scheduleRevisions?: { ongoing?: string | number };
  checksum?: string;
  activeScheduleId?: string;
}): ScheduleRefreshRevisionSnapshot {
  return {
    scheduleRevision: data.scheduleRevisions?.ongoing ?? null,
    checksum: data.checksum ?? null,
    activeScheduleId: data.activeScheduleId ?? null,
    etag: null,
  };
}

export function resolveLiveTargetWithDrift(
  items: ScheduleItem[],
  broadcastEpoch: number | null,
  totalDuration: number,
  driftMs: number
): ScheduleRefreshLiveTarget | null {
  if (!broadcastEpoch || !items.length || totalDuration <= 0) return null;
  const pos = resolveBroadcastPosition(
    items,
    broadcastEpoch,
    totalDuration,
    Date.now() + driftMs
  );
  return {
    scheduleIndex: pos.scheduleIndex,
    offsetSeconds: pos.offsetSeconds,
    loopPosition: pos.loopPosition,
  };
}

/**
 * Same row: seconds the live target moved backward (0 if unchanged or forward).
 * e.g. 472 → 466 ⇒ 6; 466 → 472 ⇒ 0.
 */
export function liveTargetSameRowBackwardDeltaSeconds(
  before: ScheduleRefreshLiveTarget | null,
  after: ScheduleRefreshLiveTarget | null
): number | null {
  if (!before || !after) return null;
  if (before.scheduleIndex !== after.scheduleIndex) return null;
  return Math.max(0, before.offsetSeconds - after.offsetSeconds);
}

export function liveTargetMovedBackwardMatteringly(
  before: ScheduleRefreshLiveTarget | null,
  after: ScheduleRefreshLiveTarget | null,
  matterThresholdSeconds: number
): boolean {
  const delta = liveTargetSameRowBackwardDeltaSeconds(before, after);
  if (delta == null) return false;
  return delta >= matterThresholdSeconds;
}
