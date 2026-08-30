/** One 12-hour TV batch (seconds). */
export const HALF_DAY_SECONDS = 43200;

/** Wall-clock ms for a slot in a half-day block (Batch A = 0, Batch B = +12h). */
export function absoluteHalfDaySlotMs(
  broadcastEpoch: number,
  halfDayOffsetSeconds: 0 | typeof HALF_DAY_SECONDS,
  cumulativeWithinBatch: number
): number {
  return broadcastEpoch + (halfDayOffsetSeconds + cumulativeWithinBatch) * 1000;
}

/** Start of the next 12h block after `nowMs`, aligned to broadcastEpoch. */
export function nextTwelveHourBlockStartMs(
  broadcastEpoch: number,
  nowMs: number
): number {
  const windowMs = HALF_DAY_SECONDS * 1000;
  const elapsed = nowMs - broadcastEpoch;
  const w = Math.floor(elapsed / windowMs);
  return broadcastEpoch + (w + 1) * windowMs;
}

/** Seconds from start of the current 12h window until item at `index` begins. */
export function cumulativeStartOffsetSeconds(
  items: { duration: number; axisStartSec?: number }[],
  index: number
): number {
  const row = items[index];
  if (row && typeof row.axisStartSec === "number") {
    return row.axisStartSec;
  }
  let s = 0;
  for (let i = 0; i < index && i < items.length; i++) {
    s += items[i]?.duration ?? 0;
  }
  return s;
}

/** Full batch order rotated so `startIndex` is first (upcoming remainder order). */
export function buildRotatedScheduleOrder(
  length: number,
  startIndex: number
): number[] {
  return buildNextNIndices(length, startIndex, length);
}

/** Preview: pin current playing row, then fill with live queue (excluding duplicate). */
export function buildPreviewRowIndices(
  length: number,
  currentIndex: number,
  liveBroadcastIndex: number,
  maxRows: number
): number[] {
  if (length <= 0) return [];
  const cap = Math.min(length, 10);
  const liveQueue = buildNextNIndices(length, liveBroadcastIndex, cap);
  const rest = liveQueue.filter(i => i !== currentIndex);
  const out: number[] = [currentIndex];
  for (const idx of rest) {
    if (out.length >= maxRows) break;
    out.push(idx);
  }
  return out;
}

/** Next `count` indices starting at `currentIndex` (wraps; caps at playlist length) */
export function buildNextNIndices(
  length: number,
  currentIndex: number,
  count: number
): number[] {
  if (length <= 0) return [];
  const n = Math.min(count, length);
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    out.push((currentIndex + k) % length);
  }
  return out;
}

/**
 * Wall-clock ms for the start of this slot’s airing in live TV (GLOBAL).
 * Uses current broadcast loop + drift-corrected `now` from the provider.
 */
export function syncedAirTimeMs(
  broadcastEpoch: number,
  totalDuration: number,
  offsetSeconds: number,
  itemDuration: number,
  now: number,
  loopPositionSeconds: number
): number {
  const loopMs = totalDuration * 1000;
  const loopStart =
    broadcastEpoch + Math.floor((now - broadcastEpoch) / loopMs) * loopMs;
  const t = loopStart + offsetSeconds * 1000;
  const inThisSlot =
    loopPositionSeconds >= offsetSeconds &&
    loopPositionSeconds < offsetSeconds + itemDuration;
  if (inThisSlot) return t;
  if (t < now) return t + loopMs;
  return t;
}

/**
 * How to interpret playlist index vs wall time for labels:
 * - `strictHalfDay` — each row is a slot in the **current** 12h window (`loopStart + offset`);
 *   use for canonical 0…n−1 lists (e.g. drawer with `forceGlobalTimes`).
 * - `rotatedQueue` — list order is **live-first then wrap**; if `off < curOff`, add one loop so
 *   wrapped rows show their **next** occurrence (legacy behavior).
 */
export type WallClockLabelMode = "strictHalfDay" | "rotatedQueue";

/**
 * Wall-clock ms when the item at `rowIndex` starts (see `WallClockLabelMode`).
 */
export function wallClockStartMsForScheduleIndex(
  broadcastEpoch: number,
  totalDuration: number,
  nowMs: number,
  liveBroadcastIndex: number,
  rowIndex: number,
  items: { duration: number }[],
  labelMode: WallClockLabelMode = "rotatedQueue"
): number {
  if (!items.length || !totalDuration) return broadcastEpoch;
  const loopMs = totalDuration * 1000;
  const loopStart =
    broadcastEpoch + Math.floor((nowMs - broadcastEpoch) / loopMs) * loopMs;
  const off = cumulativeStartOffsetSeconds(items, rowIndex);
  const curOff = cumulativeStartOffsetSeconds(items, liveBroadcastIndex);
  let wallMs = loopStart + off * 1000;
  if (labelMode === "rotatedQueue" && off < curOff) {
    wallMs += loopMs;
  }
  return wallMs;
}

export function formatPlaylistClock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function alternateBatchShortLabel(batch: "A" | "B"): string {
  return batch === "A" ? "Morning (Batch A)" : "Evening (Batch B)";
}
