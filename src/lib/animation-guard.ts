const STALE_THRESHOLD_MS = 10_000;

export interface TipAnimationEvent {
  id: string;
  seq: number;
  serverTs: number;
  eventId: string;
  selectedTips: string[];
  amount: number;
  sender: string;
}

export function createTipGuard() {
  const lastSeqByEvent = new Map<string, number>();

  return {
    shouldAccept(data: TipAnimationEvent): boolean {
      const lastSeq = lastSeqByEvent.get(data.eventId) ?? 0;
      if (data.seq <= lastSeq) return false;

      if (Date.now() - data.serverTs > STALE_THRESHOLD_MS) return false;

      if (typeof document !== "undefined" && document.hidden) return false;

      lastSeqByEvent.set(data.eventId, data.seq);
      return true;
    },
  };
}
