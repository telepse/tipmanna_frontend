/**
 * Centralized gate for tip-animation events.
 * Three independent checks — any one is sufficient to prevent replay.
 */

const STALE_THRESHOLD_MS = 10_000; // 10 seconds

// Per-event last-seen sequence (survives component remounts, not page reloads)
const lastSeqByEvent = new Map<string, number>();

export interface TipAnimationEvent {
  id:           string;
  seq:          number;
  serverTs:     number;
  eventId:      string;
  selectedTips: string[];
  amount:       number;
  sender:       string;
}

/**
 * Returns true only if the event should be animated.
 * Mutates internal state (advances lastSeq) on acceptance.
 */
export function shouldAcceptTipEvent(data: TipAnimationEvent): boolean {
  // Gate 1 — Sequence: reject out-of-order or duplicate
  const lastSeq = lastSeqByEvent.get(data.eventId) ?? 0;
  if (data.seq <= lastSeq) {
    return false;
  }

  // Gate 2 — Freshness: reject events older than threshold
  const age = Date.now() - data.serverTs;
  if (age > STALE_THRESHOLD_MS) {
    return false;
  }

  // Gate 3 — Visibility: reject events received while tab is hidden
  if (typeof document !== "undefined" && document.hidden) {
    return false;
  }

  // Accepted — advance the high-water mark
  lastSeqByEvent.set(data.eventId, data.seq);
  return true;
}

/**
 * Reset sequence tracking for an event (call on unmount if needed).
 */
export function resetSeqTracking(eventId: string) {
  lastSeqByEvent.delete(eventId);
}