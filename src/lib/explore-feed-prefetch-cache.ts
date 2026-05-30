/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { postExploreFeedBatchAction } from "@/actions/contents";

/** Must match explore first-batch size (5–10). */
export const EXPLORE_FEED_BOOT_COUNT = 8;

export type ExploreFeedPrefetchSnapshot = {
  items: any[];
  seed: string;
};

declare global {
  interface Window {
    /** Dev-only: survives React Strict Mode remount so boot is not double-consumed. */
    __EXPLORE_FEED_BOOT_DEV__?: ExploreFeedPrefetchSnapshot;
  }
}

let ready: ExploreFeedPrefetchSnapshot | null = null;
let inflight: Promise<ExploreFeedPrefetchSnapshot | null> | null = null;

/** Match active URL filters so warm cache does not contradict /explore?feedTypes=… */
function prefetchOptsFromWindow():
  | {
      feedMode: "trends";
      eventVideoTypes?: string[];
      language?: string;
      country?: string;
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  const sp = new URLSearchParams(window.location.search);
  const rawTypes = sp.get("feedTypes")?.trim();
  const eventVideoTypes = rawTypes
    ? rawTypes
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
    : [];
  const language = sp.get("feedLang")?.trim() || undefined;
  const country = sp.get("feedCountry")?.trim() || undefined;
  if (eventVideoTypes.length === 0 && !language?.length && !country?.length) {
    return undefined;
  }
  return {
    feedMode: "trends" as const,
    ...(eventVideoTypes.length ? { eventVideoTypes } : {}),
    ...(language ? { language } : {}),
    ...(country ? { country } : {}),
  };
}

async function fetchBootSnapshot(): Promise<ExploreFeedPrefetchSnapshot | null> {
  const urlOpts = prefetchOptsFromWindow();
  const r = await postExploreFeedBatchAction(
    [],
    undefined,
    EXPLORE_FEED_BOOT_COUNT,
    undefined,
    urlOpts ?? { feedMode: "trends" }
  );
  if (!r.success || !r.data) return null;
  const items = Array.isArray(r.data.items) ? r.data.items : [];
  const seed = typeof r.data.seed === "string" ? r.data.seed : "";
  if (items.length === 0) return null;
  return { items, seed };
}

/**
 * Start loading the first explore batch (deduped). Safe from hover, click, or idle.
 */
export function prefetchExploreFeedInitial(): void {
  if (typeof window === "undefined") return;
  if (ready || inflight) return;
  inflight = (async () => {
    try {
      const snap = await fetchBootSnapshot();
      if (snap) ready = snap;
      return snap;
    } finally {
      inflight = null;
    }
  })();
}

/**
 * Synchronous consume for Explore first paint (clears in-memory cache).
 * In development, one Strict Mode remount can recover the snapshot from `window`.
 * @param opts.feedMode Saves mode skips consuming the shared trends prefetch bucket.
 */
export function takeExploreFeedBoot(opts?: {
  feedMode?: "trends" | "saves" | "community";
}): {
  items: any[];
  seed: string | undefined;
} {
  if (opts?.feedMode === "saves" || opts?.feedMode === "community") {
    return { items: [], seed: undefined };
  }
  if (typeof window !== "undefined" && window.__EXPLORE_FEED_BOOT_DEV__) {
    const s = window.__EXPLORE_FEED_BOOT_DEV__;
    delete window.__EXPLORE_FEED_BOOT_DEV__;
    return { items: s.items, seed: s.seed };
  }
  if (ready) {
    const s = ready;
    ready = null;
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      window.__EXPLORE_FEED_BOOT_DEV__ = s;
    }
    return { items: s.items, seed: s.seed };
  }
  return { items: [], seed: undefined };
}

/**
 * Await an in-flight prefetch after a sync miss (e.g. user navigated before hover).
 */
export async function waitExploreFeedPrefetch(): Promise<ExploreFeedPrefetchSnapshot | null> {
  if (ready) {
    const s = ready;
    ready = null;
    return s;
  }
  if (inflight) {
    await inflight;
    if (ready) {
      const s = ready;
      ready = null;
      return s;
    }
  }
  return null;
}

/** Warm cache when user is on TV (or other heavy surfaces) without blocking. */
export function scheduleExploreFeedPrefetchIdle(): void {
  if (typeof window === "undefined") return;
  const run = () => prefetchExploreFeedInitial();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => run(), { timeout: 4000 });
  } else {
    window.setTimeout(run, 2000);
  }
}
