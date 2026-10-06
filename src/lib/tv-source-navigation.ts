const TV_COMMUNITY_STORAGE_KEY = "tipmanna-tv-community-id";

/** Read community TV source from `?community=` (preferred) or persisted picker choice. */
export function readTvSourceCommunityIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search)
      .get("community")
      ?.trim();
    if (fromQuery) return fromQuery;
    const stored = localStorage.getItem(TV_COMMUNITY_STORAGE_KEY)?.trim();
    return stored || null;
  } catch {
    return null;
  }
}

export function buildTvPagePath(communityId: string | null): string {
  const cid = communityId?.trim();
  return cid ? `/tv?community=${encodeURIComponent(cid)}` : "/tv";
}

export function persistTvSourceCommunityId(communityId: string | null): void {
  try {
    const cid = communityId?.trim();
    if (cid) localStorage.setItem(TV_COMMUNITY_STORAGE_KEY, cid);
    else localStorage.removeItem(TV_COMMUNITY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Full navigation so /tv remounts and loads the selected community schedule. */
export function navigateToTvSource(communityId: string | null): void {
  if (typeof window === "undefined") return;
  if (communityId === null) {
    persistTvSourceCommunityId(null);
  }
  const target = buildTvPagePath(communityId);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === target) {
    window.location.reload();
    return;
  }
  window.location.assign(target);
}
