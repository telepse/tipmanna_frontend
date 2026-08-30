export type DiscoverCatalogSnapshot = {
  contents: unknown[];
  latestContents: unknown[];
  spotlightContents: unknown[];
  recommendedContents: unknown[];
  mostTippedContents: unknown[];
  programs: unknown[];
  playlists: unknown[];
  liveStreams: {
    upcoming: unknown[];
    live: unknown[];
    recentlyEnded: unknown[];
  };
  tippers: unknown[];
  topCommunities: unknown[];
  loadedAt: number;
};

const STORAGE_KEY = "tipmanna:discover-catalog:v2";
const TTL_MS = 10 * 60 * 1000;

export function readDiscoverCatalogCache(): DiscoverCatalogSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoverCatalogSnapshot;
    if (!parsed?.loadedAt || Date.now() - parsed.loadedAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDiscoverCatalogCache(
  snapshot: Omit<DiscoverCatalogSnapshot, "loadedAt">
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: DiscoverCatalogSnapshot = {
      ...snapshot,
      loadedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function isDiscoverCatalogStale(
  snapshot: DiscoverCatalogSnapshot | null,
  maxAgeMs = TTL_MS
): boolean {
  if (!snapshot) return true;
  return Date.now() - snapshot.loadedAt > maxAgeMs;
}

/** Rails that should auto-refresh when the panel reopens after this age. */
export const DISCOVER_LIVE_RAIL_STALE_MS = 45_000;
export const DISCOVER_DYNAMIC_RAIL_STALE_MS = 5 * 60_000;

export const DISCOVER_RAIL_INITIAL_COUNT = 5;

export function sliceDiscoverRail<T>(items: T[], expanded: boolean): T[] {
  if (expanded || items.length <= DISCOVER_RAIL_INITIAL_COUNT) {
    return items;
  }
  return items.slice(0, DISCOVER_RAIL_INITIAL_COUNT);
}
