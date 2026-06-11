export const TV_HALF_DAY_SECONDS = 43_200;

export type ScheduleItem = {
  id: string;
  duration: number;
  /** Seconds from the start of the current 12h broadcast window. */
  axisStartSec?: number;
  /** Exclusive end on the 12h axis. */
  axisEndSec?: number;
  /** YouTube seek at start of this virtual row (trimmed regular segments). */
  seekBaseSeconds?: number;
  segmentKind?: "regular" | "notice" | "enforcement";
  channel: {
    url: string;
    title?: string;
  };
};

export type BroadcastPosition = {
  scheduleIndex: number;
  offsetSeconds: number;
  item: ScheduleItem | null;
  loopPosition: number;
  totalDuration: number;
  windowIndex: number;
  windowStartMs: number;
};

export function computeLoopPositionSec(
  broadcastEpoch: number,
  totalDuration: number,
  now: number
): { loopPosition: number; windowIndex: number; windowStartMs: number } {
  const total = totalDuration > 0 ? totalDuration : TV_HALF_DAY_SECONDS;
  const elapsedSeconds = Math.floor((now - broadcastEpoch) / 1000);
  const windowIndex = Math.floor(elapsedSeconds / total);
  const loopPosition = ((elapsedSeconds % total) + total) % total;
  const windowStartMs = broadcastEpoch + windowIndex * total * 1000;
  return { loopPosition, windowIndex, windowStartMs };
}

/**
 * Pure function: determines the current broadcast video and offset from a fixed
 * channel epoch. Uses axis coordinates when present so filtered playlists stay
 * on the global timeline.
 */
export function resolveBroadcastPosition(
  items: ScheduleItem[],
  broadcastEpoch: number,
  totalDuration: number,
  now: number
): BroadcastPosition {
  const total = totalDuration > 0 ? totalDuration : TV_HALF_DAY_SECONDS;
  const { loopPosition, windowIndex, windowStartMs } = computeLoopPositionSec(
    broadcastEpoch,
    total,
    now
  );

  if (!items.length) {
    return {
      scheduleIndex: 0,
      offsetSeconds: 0,
      item: null,
      loopPosition,
      totalDuration: total,
      windowIndex,
      windowStartMs,
    };
  }

  const hasAxis = items.some(
    item =>
      typeof item.axisStartSec === "number" &&
      Number.isFinite(item.axisStartSec)
  );

  if (hasAxis) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const start = item.axisStartSec ?? 0;
      const end =
        typeof item.axisEndSec === "number"
          ? item.axisEndSec
          : start + item.duration;
      if (loopPosition >= start && loopPosition < end) {
        const within = loopPosition - start;
        const seekBase = item.seekBaseSeconds ?? 0;
        return {
          scheduleIndex: i,
          offsetSeconds: seekBase + within,
          item,
          loopPosition,
          totalDuration: total,
          windowIndex,
          windowStartMs,
        };
      }
    }
  }

  let cursor = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const end = cursor + item.duration;
    if (loopPosition < end) {
      const within = loopPosition - cursor;
      const seekBase = item.seekBaseSeconds ?? 0;
      return {
        scheduleIndex: i,
        offsetSeconds: seekBase + within,
        item,
        loopPosition,
        totalDuration: total,
        windowIndex,
        windowStartMs,
      };
    }
    cursor = end;
  }

  const first = items[0]!;
  return {
    scheduleIndex: 0,
    offsetSeconds: first.seekBaseSeconds ?? 0,
    item: first,
    loopPosition,
    totalDuration: total,
    windowIndex,
    windowStartMs,
  };
}
