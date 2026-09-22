import type { CommunityExploreCatalogRow } from "@/actions/communities";

export type CommunityExploreCatalogSnapshot = {
  total: number;
  alphabetical: CommunityExploreCatalogRow[];
  topByTips: CommunityExploreCatalogRow[];
  loadedAt: number;
};

const STORAGE_KEY = "tipmanna:community-explore-catalog:v1";
const TTL_MS = 10 * 60 * 1000;

export function readCommunityExploreCatalogCache(): CommunityExploreCatalogSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CommunityExploreCatalogSnapshot;
    if (!parsed?.loadedAt || Date.now() - parsed.loadedAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCommunityExploreCatalogCache(
  snapshot: Omit<CommunityExploreCatalogSnapshot, "loadedAt">
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CommunityExploreCatalogSnapshot = {
      ...snapshot,
      loadedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearCommunityExploreCatalogCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isCommunityExploreCatalogStale(
  snapshot: CommunityExploreCatalogSnapshot | null,
  maxAgeMs = TTL_MS
): boolean {
  if (!snapshot) return true;
  return Date.now() - snapshot.loadedAt > maxAgeMs;
}
