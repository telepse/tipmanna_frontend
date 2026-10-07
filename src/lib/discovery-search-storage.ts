const RECENT_KEY = "discovery-recent-searches";
const MAX_RECENT = 8;

export const DISCOVERY_TRENDING_SEARCHES = ["Live", "Comedy", "Music"] as const;

export function readRecentDiscoverySearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentDiscoverySearch(term: string): void {
  const q = term.trim();
  if (!q || typeof window === "undefined") return;
  const prev = readRecentDiscoverySearches().filter(
    item => item.toLowerCase() !== q.toLowerCase()
  );
  const next = [q, ...prev].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}
