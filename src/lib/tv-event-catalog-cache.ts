import { getEventCharacterCatalogAction } from "@/actions/events";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import { resolveTvScheduleEventId } from "@/lib/resolve-tv-schedule-event-id";
import type { RoomCharacter } from "@/types";

export type TvEventCatalog = {
  characterSets: {
    id: string;
    name: string;
    characters: RoomCharacter[];
  }[];
  characters: RoomCharacter[];
};

const EMPTY_CATALOG: TvEventCatalog = { characterSets: [], characters: [] };

const memoryCache = new Map<string, TvEventCatalog>();
const inflight = new Map<string, Promise<TvEventCatalog | null>>();
const listeners = new Set<() => void>();

const SESSION_PREFIX = "tv-event-catalog-v2:";

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function readSessionCatalog(eventId: string): TvEventCatalog | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${eventId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TvEventCatalog;
    if (!parsed || !Array.isArray(parsed.characterSets)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCatalog(eventId: string, catalog: TvEventCatalog) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${SESSION_PREFIX}${eventId}`,
      JSON.stringify(catalog)
    );
  } catch {
    // ignore quota errors
  }
}

function toCatalog(rawSets: unknown): TvEventCatalog {
  const parsed = parseEventCharacterCatalog(rawSets);
  return {
    characterSets: parsed.characterSets,
    characters: parsed.tippingCharacters,
  };
}

export function getCachedTvEventCatalog(
  eventId: string
): TvEventCatalog | null {
  const trimmed = eventId.trim();
  if (!trimmed) return null;
  return memoryCache.get(trimmed) ?? readSessionCatalog(trimmed);
}

export function subscribeTvEventCatalog(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function unwrapCharacterSetsFromActionData(
  data:
    | { characterSets?: unknown; data?: { characterSets?: unknown } }
    | undefined
): unknown {
  if (!data) return undefined;
  if (Array.isArray(data.characterSets)) return data.characterSets;
  const nested = data.data?.characterSets;
  if (Array.isArray(nested)) return nested;
  return data.characterSets;
}

async function fetchCatalogOnce(
  eventId: string
): Promise<TvEventCatalog | null> {
  try {
    const res = await getEventCharacterCatalogAction(eventId);
    if (!res.success) return null;
    const catalog = toCatalog(
      unwrapCharacterSetsFromActionData(
        res.data as {
          characterSets?: unknown;
          data?: { characterSets?: unknown };
        }
      )
    );
    memoryCache.set(eventId, catalog);
    writeSessionCatalog(eventId, catalog);
    return catalog;
  } catch {
    return null;
  }
}

/**
 * Load event catalog. Returns null on failure (not cached). Successful empty
 * catalogs are cached. Retries the action once before giving up.
 */
export async function loadTvEventCatalog(
  eventId: string
): Promise<TvEventCatalog | null> {
  const trimmed = eventId.trim();
  if (!trimmed) return EMPTY_CATALOG;

  const cached = getCachedTvEventCatalog(trimmed);
  if (cached) return cached;

  const pending = inflight.get(trimmed);
  if (pending) return pending;

  const promise = (async () => {
    try {
      let catalog = await fetchCatalogOnce(trimmed);
      if (!catalog) {
        catalog = await fetchCatalogOnce(trimmed);
      }
      return catalog;
    } finally {
      inflight.delete(trimmed);
      notifyListeners();
    }
  })();

  inflight.set(trimmed, promise);
  return promise;
}

export function prefetchTvEventCatalogs(eventIds: string[]) {
  const unique = [...new Set(eventIds.map(id => id.trim()).filter(Boolean))];
  for (const eventId of unique) {
    if (getCachedTvEventCatalog(eventId) || inflight.has(eventId)) continue;
    void loadTvEventCatalog(eventId);
  }
}

export function collectTvScheduleEventIds(
  items: { channel?: { eventId?: string }; defaultChannelEventId?: string }[],
  limit = 24
): string[] {
  const ids: string[] = [];
  for (const item of items) {
    const eventId = resolveTvScheduleEventId(item);
    if (!eventId || ids.includes(eventId)) continue;
    ids.push(eventId);
    if (ids.length >= limit) break;
  }
  return ids;
}

/** Unique event ids from startIndex for up to count schedule rows. */
export function collectTvScheduleEventIdsFromIndex(
  items: { channel?: { eventId?: string }; defaultChannelEventId?: string }[],
  startIndex = 0,
  count = 4
): string[] {
  const ids: string[] = [];
  for (
    let i = startIndex;
    i < Math.min(items.length, startIndex + count);
    i++
  ) {
    const eventId = resolveTvScheduleEventId(items[i]);
    if (!eventId || ids.includes(eventId)) continue;
    ids.push(eventId);
  }
  return ids;
}

export function collectExploreFeedEventIds(
  items: { event?: { id?: string } }[],
  limit = 24
): string[] {
  const ids: string[] = [];
  for (const item of items) {
    const eventId = item?.event?.id;
    if (!eventId || ids.includes(eventId)) continue;
    ids.push(eventId);
    if (ids.length >= limit) break;
  }
  return ids;
}

export function primeTvEventCatalog(eventId: string, rawSets: unknown) {
  const trimmed = eventId.trim();
  if (!trimmed) return;
  const catalog = toCatalog(rawSets);
  memoryCache.set(trimmed, catalog);
  writeSessionCatalog(trimmed, catalog);
  notifyListeners();
}

/** Test-only reset. */
export function resetTvEventCatalogCacheForTests(): void {
  memoryCache.clear();
  inflight.clear();
}

export { unwrapCharacterSetsFromActionData };
