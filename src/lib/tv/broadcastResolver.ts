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
  noticePhase?: "pre" | "post";
  enforcementId?: string;
  blockTitle?: string;
  sectionTitle?: string;
  sectionHalf?: "FIRST_HALF" | "SECOND_HALF";
  isSectionStart?: boolean;
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

  const baseFields = {
    loopPosition,
    totalDuration: total,
    windowIndex,
    windowStartMs,
  };

  if (hasAxis) {
    const axisPos = resolveAxisBroadcastPosition(
      items,
      loopPosition,
      baseFields
    );
    if (axisPos) return axisPos;
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
    ...baseFields,
  };
}

function axisBounds(item: ScheduleItem): { start: number; end: number } | null {
  if (
    typeof item.axisStartSec !== "number" ||
    !Number.isFinite(item.axisStartSec)
  ) {
    return null;
  }
  const start = item.axisStartSec;
  const end =
    typeof item.axisEndSec === "number" && Number.isFinite(item.axisEndSec)
      ? item.axisEndSec
      : start + item.duration;
  return { start, end };
}

/**
 * §8c axis resolver — never falls through to packed durations when axis exists.
 */
export function resolveAxisBroadcastPosition(
  items: ScheduleItem[],
  loopPosition: number,
  baseFields: Pick<
    BroadcastPosition,
    "loopPosition" | "totalDuration" | "windowIndex" | "windowStartMs"
  >
): BroadcastPosition | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const bounds = axisBounds(item);
    if (!bounds) continue;
    const { start, end } = bounds;
    if (loopPosition >= start && loopPosition < end) {
      const within = loopPosition - start;
      const seekBase = item.seekBaseSeconds ?? 0;
      return {
        scheduleIndex: i,
        offsetSeconds: seekBase + within,
        item,
        ...baseFields,
      };
    }
  }

  let lastAxis: {
    index: number;
    item: ScheduleItem;
    start: number;
    end: number;
  } | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const bounds = axisBounds(item);
    if (!bounds) continue;
    const { start, end } = bounds;
    if (loopPosition < start) {
      const seekBase = item.seekBaseSeconds ?? 0;
      return {
        scheduleIndex: i,
        offsetSeconds: seekBase,
        item,
        ...baseFields,
      };
    }
    lastAxis = { index: i, item, start, end };
  }

  if (lastAxis) {
    const { index, item, start, end } = lastAxis;

    if (loopPosition >= end) {
      const afterEnd = resolveAxisSuccessorAfterEnd(
        items,
        loopPosition,
        index,
        baseFields
      );
      if (afterEnd) return afterEnd;
    }

    const seekBase = item.seekBaseSeconds ?? 0;
    const span = Math.max(0, end - start);
    const offsetSeconds = seekBase + Math.max(0, span - 1);
    return {
      scheduleIndex: index,
      offsetSeconds,
      item,
      ...baseFields,
    };
  }

  return null;
}

/**
 * When loopPosition is past row `afterIndex` axis end, join the next axis row
 * (§8c gap or in-window) instead of end-capping the prior row.
 */
function resolveAxisSuccessorAfterEnd(
  items: ScheduleItem[],
  loopPosition: number,
  afterIndex: number,
  baseFields: Pick<
    BroadcastPosition,
    "loopPosition" | "totalDuration" | "windowIndex" | "windowStartMs"
  >
): BroadcastPosition | null {
  for (let j = afterIndex + 1; j < items.length; j++) {
    const nextItem = items[j]!;
    const bounds = axisBounds(nextItem);
    if (!bounds) continue;
    const { start, end } = bounds;
    const seekBase = nextItem.seekBaseSeconds ?? 0;
    if (loopPosition < start) {
      return {
        scheduleIndex: j,
        offsetSeconds: seekBase,
        item: nextItem,
        ...baseFields,
      };
    }
    if (loopPosition >= start && loopPosition < end) {
      return {
        scheduleIndex: j,
        offsetSeconds: seekBase + (loopPosition - start),
        item: nextItem,
        ...baseFields,
      };
    }
  }
  return null;
}
