const SESSION_KEY = "tipmanna_explore_drawer_intent_v1";

export type ExploreDrawerIntent =
  | { kind: "creator"; username: string }
  | { kind: "community"; communityId: string };

export function writeExploreDrawerIntent(intent: ExploreDrawerIntent | null) {
  if (typeof window === "undefined") return;
  try {
    if (!intent) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(intent));
  } catch {
    /* quota */
  }
}

export function readExploreDrawerIntent(): ExploreDrawerIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExploreDrawerIntent;
    if (parsed?.kind === "creator" && parsed.username?.trim()) {
      return { kind: "creator", username: parsed.username.trim() };
    }
    if (parsed?.kind === "community" && parsed.communityId?.trim()) {
      return {
        kind: "community",
        communityId: parsed.communityId.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}
