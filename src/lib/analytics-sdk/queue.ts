import {
  BEACON_ACK_TTL_MS,
  type SdkQueuedItem,
  type V2IngestAckBody,
} from "./types";

export const QUEUE_STORAGE_KEY = "tipmanna-analytics-sdk-v2-queue";
export const MAX_QUEUE = 80;

let hotQueue: SdkQueuedItem[] = [];
let droppedCount = 0;

function readStorage(): SdkQueuedItem[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as SdkQueuedItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: SdkQueuedItem[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (items.length === 0) {
      sessionStorage.removeItem(QUEUE_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function trim(items: SdkQueuedItem[]): SdkQueuedItem[] {
  if (items.length <= MAX_QUEUE) return items;
  droppedCount += items.length - MAX_QUEUE;
  return items.slice(items.length - MAX_QUEUE);
}

function materializeQueue(): SdkQueuedItem[] {
  if (hotQueue.length > 0) return hotQueue;
  hotQueue = readStorage();
  return hotQueue;
}

function persistQueue(): void {
  writeStorage(hotQueue);
}

export function getDroppedCount(): number {
  return droppedCount;
}

export function resetQueueStateForTests(): void {
  hotQueue = [];
  droppedCount = 0;
  writeStorage([]);
}

/** Copy pending items without removing (beacon path). */
export function peekPendingQueue(): SdkQueuedItem[] {
  return [...materializeQueue()];
}

/** All pending items for fetch flush; clears hot + sessionStorage. */
export function drainPendingQueue(): SdkQueuedItem[] {
  const merged = materializeQueue();
  hotQueue = [];
  writeStorage([]);
  return merged;
}

export function enqueueSdkEvents(events: SdkQueuedItem[]): void {
  if (events.length === 0) return;
  hotQueue = trim([...materializeQueue(), ...events]);
  writeStorage(hotQueue);
}

/** Restore items that were not acked (network failure or !res.ok). */
export function restoreUnacked(events: SdkQueuedItem[]): void {
  if (events.length === 0) return;
  hotQueue = trim([...events, ...materializeQueue()]);
  writeStorage(hotQueue);
}

/** Mark UIDs as beaconed; queue retained until fetch ack. */
export function markBeaconSent(eventUids: string[]): void {
  if (eventUids.length === 0) return;
  const uidSet = new Set(eventUids);
  const now = Date.now();
  hotQueue = materializeQueue().map(item =>
    uidSet.has(item.eventUid) ? { ...item, beaconedAt: now } : item
  );
  persistQueue();
}

/** Drop stale beaconed items that never received server ack. */
export function pruneStaleBeaconItems(
  maxAgeMs: number = BEACON_ACK_TTL_MS
): number {
  const now = Date.now();
  const before = materializeQueue().length;
  hotQueue = hotQueue.filter(
    item => item.beaconedAt == null || now - item.beaconedAt <= maxAgeMs
  );
  if (hotQueue.length !== before) {
    persistQueue();
  }
  return before - hotQueue.length;
}

/** Drop accepted + duplicate UIDs; keep rejected for retry. */
export function applyAckAndGetRetry(
  batch: SdkQueuedItem[],
  ack: V2IngestAckBody
): SdkQueuedItem[] {
  const dupSet = new Set(ack.duplicates);
  const rejectedIndexes = new Set(ack.rejected.map(r => r.index));
  const retry: SdkQueuedItem[] = [];
  batch.forEach((item, index) => {
    if (rejectedIndexes.has(index)) {
      retry.push(item);
      return;
    }
    if (dupSet.has(item.eventUid)) return;
    /* accepted — drop */
  });
  return retry;
}

/** Remove acked UIDs from queue after successful fetch (when queue was not drained). */
export function removeAckedEventUids(
  batch: SdkQueuedItem[],
  ack: V2IngestAckBody
): void {
  const retry = applyAckAndGetRetry(batch, ack);
  const retryUids = new Set(retry.map(r => r.eventUid));
  hotQueue = materializeQueue().filter(item => retryUids.has(item.eventUid));
  persistQueue();
}
