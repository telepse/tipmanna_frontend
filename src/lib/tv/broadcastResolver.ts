export type ScheduleItem = {
  id: string;
  duration: number;
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
};

/**
 * Pure function: determines the current broadcast video and offset.
 *
 * All inputs are explicit -- `now` is caller-provided so drift correction
 * happens at the call site, and the function remains testable.
 */
export function resolveBroadcastPosition(
  items: ScheduleItem[],
  broadcastEpoch: number,
  totalDuration: number,
  now: number
): BroadcastPosition {
  if (!items.length || !totalDuration) {
    return {
      scheduleIndex: 0,
      offsetSeconds: 0,
      item: null,
      loopPosition: 0,
      totalDuration,
    };
  }

  const elapsedSeconds = Math.floor((now - broadcastEpoch) / 1000);
  const loopPosition =
    ((elapsedSeconds % totalDuration) + totalDuration) % totalDuration;

  let cursor = 0;

  for (let i = 0; i < items.length; i++) {
    const end = cursor + items[i].duration;

    if (loopPosition < end) {
      const within = loopPosition - cursor;
      const seekBase = items[i].seekBaseSeconds ?? 0;
      return {
        scheduleIndex: i,
        offsetSeconds: seekBase + within,
        item: items[i],
        loopPosition,
        totalDuration,
      };
    }

    cursor = end;
  }

  const seek0 = items[0]?.seekBaseSeconds ?? 0;
  return {
    scheduleIndex: 0,
    offsetSeconds: seek0,
    item: items[0] ?? null,
    loopPosition,
    totalDuration,
  };
}
