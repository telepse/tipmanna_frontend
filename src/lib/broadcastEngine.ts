type ScheduleItem = {
  id: string;
  duration: number;
  channel: {
    url: string;
    title: string;
  };
};

export type BroadcastState = {
  index: number;
  offset: number;
  startedAt: number;
};

export function resolveBroadcastState(
  broadcastEpoch: number,
  totalDuration: number,
  items: ScheduleItem[]
): BroadcastState {
  const now = Date.now();

  const elapsed = Math.floor((now - broadcastEpoch) / 1000);
  const position = elapsed % totalDuration;

  let cursor = 0;

  for (let i = 0; i < items.length; i++) {
    const duration = items[i].duration;

    if (position >= cursor && position < cursor + duration) {
      return {
        index: i,
        offset: position - cursor,
        startedAt: now,
      };
    }

    cursor += duration;
  }

  return {
    index: 0,
    offset: 0,
    startedAt: now,
  };
}
