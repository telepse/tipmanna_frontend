/** Tab-scoped TV playback continuity across same-tab route leave/return. */

export const TV_PLAYBACK_SNAPSHOT_KEY = "tipmanna:tv-playback-snapshot:v1";

export type TvPlaybackMode = "GLOBAL" | "LOCAL";

export type TvPlaybackSnapshot = {
  mode: TvPlaybackMode;
  currentIndex: number;
  startSeconds: number;
  videoId: string | null;
  communityId: string | null;
  at: number;
};

let commandGeneration = 0;

/** Monotonic id for stale onReady / construct rejection (not a remount key). */
export function bumpTvCommandGeneration(): number {
  commandGeneration += 1;
  return commandGeneration;
}

export function getTvCommandGeneration(): number {
  return commandGeneration;
}

export function isStaleTvCommandGeneration(gen: number): boolean {
  return gen !== commandGeneration;
}

/** Test-only reset. */
export function resetTvCommandGenerationForTests(): void {
  commandGeneration = 0;
}

export function writeTvPlaybackSnapshot(
  snapshot: Omit<TvPlaybackSnapshot, "at">
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: TvPlaybackSnapshot = { ...snapshot, at: Date.now() };
    sessionStorage.setItem(TV_PLAYBACK_SNAPSHOT_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readTvPlaybackSnapshot(): TvPlaybackSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TV_PLAYBACK_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TvPlaybackSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.mode !== "GLOBAL" && parsed.mode !== "LOCAL") return null;
    if (typeof parsed.currentIndex !== "number") return null;
    if (typeof parsed.startSeconds !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTvPlaybackSnapshotForTests(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TV_PLAYBACK_SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}
