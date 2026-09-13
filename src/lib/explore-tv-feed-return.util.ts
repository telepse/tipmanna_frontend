"use client";

const TV_FEED_RESTORE_KEY = "tipmanna:tv-feed-ui-restore:v1";
const RESTORE_TTL_MS = 30 * 60 * 1000;

export type TvFeedUiSnapshot = {
  scrollTop: number;
  channelId?: string;
  cardIndex?: number;
  createdAt: number;
};

export function isDedicatedTvFeedReturnTo(
  path: string | null | undefined
): boolean {
  if (!path) return false;
  try {
    const url = new URL(path, "http://local");
    if (url.pathname !== "/explore") return false;
    return url.searchParams.get("feedTab") === "tv";
  } catch {
    return false;
  }
}

export function stashTvFeedUiRestore(snapshot: TvFeedUiSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TV_FEED_RESTORE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export function readTvFeedUiRestore(): TvFeedUiSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TV_FEED_RESTORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TvFeedUiSnapshot;
    if (!parsed?.createdAt) return null;
    if (Date.now() - parsed.createdAt > RESTORE_TTL_MS) {
      sessionStorage.removeItem(TV_FEED_RESTORE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTvFeedUiRestore(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TV_FEED_RESTORE_KEY);
  } catch {
    /* ignore */
  }
}

export function applyTvFeedScrollRestore(
  container: HTMLElement | null | undefined,
  scrollTop: number
): void {
  if (typeof window === "undefined" || scrollTop <= 0) return;
  container?.scrollTo({ top: scrollTop, behavior: "auto" });
}

export function scheduleTvFeedScrollRestore(
  getContainer: () => HTMLElement | null | undefined,
  scrollTop: number
): () => void {
  const delays = [0, 50, 200, 500];
  const timers: number[] = [];
  const run = () => applyTvFeedScrollRestore(getContainer(), scrollTop);
  run();
  if (typeof window === "undefined") return () => undefined;
  requestAnimationFrame(run);
  for (const ms of delays.slice(1)) {
    timers.push(window.setTimeout(run, ms));
  }
  return () => {
    for (const id of timers) window.clearTimeout(id);
  };
}
