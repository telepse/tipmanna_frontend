/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { postExploreFeedBatchAction } from "@/actions/contents";
import { getExploreDefaultBucketId } from "@/lib/explore-default-bucket";
import { isExploreTvPrefetchAfterStableEnabled } from "@/lib/explore-feature-flags";
import {
  isUnscopedGlobalTrendsIdentity,
  type ExploreFeedSessionKeyParams,
} from "@/lib/explore-feed-session-cache";
import type { ExploreSsrBootPayload } from "@/lib/explore-ssr-boot";
import { EXPLORE_FEED_BOOT_COUNT } from "@/lib/explore-feed-boot-constants";
import { EXPLORE_FEED_PREFETCH_WAIT_TIMEOUT_MS } from "@/lib/explore-feed-fetch-timeout";

export { EXPLORE_FEED_BOOT_COUNT } from "@/lib/explore-feed-boot-constants";

export type ExploreFeedPrefetchSnapshot = {
  items: any[];
  seed: string;
  bucketId?: number;
};

declare global {
  interface Window {
    /** Dev-only: survives React Strict Mode remount so boot is not double-consumed. */
    __EXPLORE_FEED_BOOT_DEV__?: ExploreFeedPrefetchSnapshot;
    /** SSR inline boot from explore page HTML. */
    __EXPLORE_SSR_BOOT__?: ExploreSsrBootPayload;
  }
}

let ready: ExploreFeedPrefetchSnapshot | null = null;
let savesReady: ExploreFeedPrefetchSnapshot | null = null;
const communityReady: Map<string, ExploreFeedPrefetchSnapshot> = new Map();
let inflight: Promise<ExploreFeedPrefetchSnapshot | null> | null = null;
let savesInflight: Promise<ExploreFeedPrefetchSnapshot | null> | null = null;
const communityInflight = new Map<
  string,
  Promise<ExploreFeedPrefetchSnapshot | null>
>();

function currentBucketId(): number {
  return getExploreDefaultBucketId();
}

function isBucketStale(snap: ExploreFeedPrefetchSnapshot | null): boolean {
  if (!snap?.bucketId) return false;
  return snap.bucketId !== currentBucketId();
}

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
  if (urlOpts) {
    const r = await postExploreFeedBatchAction(
      [],
      undefined,
      EXPLORE_FEED_BOOT_COUNT,
      undefined,
      urlOpts
    );
    if (!r.success || !r.data) return null;
    const items = Array.isArray(r.data.items) ? r.data.items : [];
    const seed = typeof r.data.seed === "string" ? r.data.seed : "";
    if (items.length === 0) return null;
    return { items, seed, bucketId: currentBucketId() };
  }
  const r = await postExploreFeedBatchAction(
    [],
    undefined,
    EXPLORE_FEED_BOOT_COUNT,
    undefined,
    { feedMode: "trends" }
  );
  if (!r.success || !r.data) return null;
  const items = Array.isArray(r.data.items) ? r.data.items : [];
  const seed = typeof r.data.seed === "string" ? r.data.seed : "";
  if (items.length === 0) return null;
  return { items, seed, bucketId: currentBucketId() };
}

async function fetchSavesSnapshot(): Promise<ExploreFeedPrefetchSnapshot | null> {
  const r = await postExploreFeedBatchAction(
    [],
    undefined,
    EXPLORE_FEED_BOOT_COUNT,
    undefined,
    { feedMode: "saves" }
  );
  if (!r.success || !r.data || r.data.savesFeedEligible === false) return null;
  const items = Array.isArray(r.data.items) ? r.data.items : [];
  const seed = typeof r.data.seed === "string" ? r.data.seed : "";
  if (items.length === 0) return null;
  return { items, seed };
}

async function fetchCommunitySnapshot(
  communityIds: string[]
): Promise<ExploreFeedPrefetchSnapshot | null> {
  if (!communityIds.length) return null;
  const r = await postExploreFeedBatchAction(
    [],
    undefined,
    EXPLORE_FEED_BOOT_COUNT,
    undefined,
    { feedMode: "community", communityIds }
  );
  if (!r.success || !r.data) return null;
  const items = Array.isArray(r.data.items) ? r.data.items : [];
  const seed = typeof r.data.seed === "string" ? r.data.seed : "";
  if (items.length === 0) return null;
  return { items, seed };
}

/** Seed from SSR inline script or server prop. */
export function seedExploreFeedBootFromSsr(
  payload: ExploreSsrBootPayload
): void {
  if (typeof window === "undefined") return;
  if (!payload.items?.length) return;
  window.__EXPLORE_SSR_BOOT__ = payload;
  ready = {
    items: payload.items,
    seed: payload.seed,
    bucketId: payload.bucketId,
  };
}

/** E2E-only: deterministic saves-tab boot (requires dual fixture gate). */
export function seedExploreE2eSavesBoot(payload: ExploreSsrBootPayload): void {
  if (typeof window === "undefined") return;
  if (!payload.items?.length) return;
  savesReady = {
    items: payload.items,
    seed: payload.seed,
    bucketId: payload.bucketId,
  };
}

function consumeSsrBoot(): ExploreFeedPrefetchSnapshot | null {
  if (typeof window === "undefined") return null;
  const inline = window.__EXPLORE_SSR_BOOT__;
  if (inline?.items?.length) {
    delete window.__EXPLORE_SSR_BOOT__;
    if (isBucketStale(inline)) return null;
    return {
      items: inline.items,
      seed: inline.seed,
      bucketId: inline.bucketId,
    };
  }
  return null;
}

/**
 * Start loading the first explore batch (deduped). Safe from hover, click, or idle.
 */
export function prefetchExploreFeedInitial(): void {
  if (typeof window === "undefined") return;
  if (ready && !isBucketStale(ready)) return;
  if (isBucketStale(ready)) ready = null;
  if (inflight) return;
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

export function prefetchExploreSavesFeed(): void {
  if (typeof window === "undefined") return;
  if (savesReady || savesInflight) return;
  savesInflight = (async () => {
    try {
      const snap = await fetchSavesSnapshot();
      if (snap) savesReady = snap;
      return snap;
    } finally {
      savesInflight = null;
    }
  })();
}

export function prefetchExploreCommunityFeed(communityIds: string[]): void {
  if (typeof window === "undefined" || !communityIds.length) return;
  const key = [...communityIds].sort().join("|");
  if (communityReady.has(key) || communityInflight.has(key)) return;
  const p = (async () => {
    try {
      const snap = await fetchCommunitySnapshot(communityIds);
      if (snap) communityReady.set(key, snap);
      return snap;
    } finally {
      communityInflight.delete(key);
    }
  })();
  communityInflight.set(key, p);
}

/**
 * Synchronous consume for Explore first paint (clears in-memory cache).
 */
function trendsIdentityFromOpts(opts?: {
  feedMode?: "trends" | "saves" | "community";
  communityIds?: string[];
  identity?: ExploreFeedSessionKeyParams;
}): ExploreFeedSessionKeyParams {
  if (opts?.identity) return opts.identity;
  return {
    feedMode: "trends",
    communityIds: opts?.communityIds,
  };
}

export function takeExploreFeedBoot(opts?: {
  feedMode?: "trends" | "saves" | "community";
  communityIds?: string[];
  identity?: ExploreFeedSessionKeyParams;
}): {
  items: any[];
  seed: string | undefined;
} {
  if (opts?.feedMode === "saves") {
    if (savesReady) {
      const s = savesReady;
      savesReady = null;
      return { items: s.items, seed: s.seed };
    }
    return { items: [], seed: undefined };
  }
  if (opts?.feedMode === "community") {
    const key = [...(opts.communityIds ?? [])].sort().join("|");
    const hit = key ? communityReady.get(key) : undefined;
    if (hit) {
      communityReady.delete(key);
      return { items: hit.items, seed: hit.seed };
    }
    return { items: [], seed: undefined };
  }

  const trendsIdentity = trendsIdentityFromOpts(opts);
  if (!isUnscopedGlobalTrendsIdentity(trendsIdentity)) {
    return { items: [], seed: undefined };
  }

  const ssr = consumeSsrBoot();
  if (ssr) return { items: ssr.items, seed: ssr.seed };

  if (typeof window !== "undefined" && window.__EXPLORE_FEED_BOOT_DEV__) {
    const s = window.__EXPLORE_FEED_BOOT_DEV__;
    delete window.__EXPLORE_FEED_BOOT_DEV__;
    if (!isBucketStale(s)) return { items: s.items, seed: s.seed };
  }
  if (ready && !isBucketStale(ready)) {
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
  if (isBucketStale(ready)) ready = null;
  return { items: [], seed: undefined };
}

/** Fail-open: return null when prefetch does not settle within timeoutMs. */
async function awaitPrefetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raced = await Promise.race([
      promise.then(v => ({ ok: true as const, v })),
      new Promise<{ ok: false }>(resolve => {
        timer = setTimeout(() => resolve({ ok: false }), timeoutMs);
      }),
    ]);
    return raced.ok ? raced.v : null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function waitExploreFeedPrefetch(opts?: {
  feedMode?: "trends" | "saves" | "community";
  communityIds?: string[];
  identity?: ExploreFeedSessionKeyParams;
}): Promise<ExploreFeedPrefetchSnapshot | null> {
  if (opts?.feedMode === "saves") {
    if (savesReady) {
      const s = savesReady;
      savesReady = null;
      return s;
    }
    if (savesInflight) {
      await awaitPrefetchWithTimeout(
        savesInflight,
        EXPLORE_FEED_PREFETCH_WAIT_TIMEOUT_MS
      );
      if (savesReady) {
        const s = savesReady;
        savesReady = null;
        return s;
      }
    }
    return null;
  }
  if (opts?.feedMode === "community") {
    const key = [...(opts.communityIds ?? [])].sort().join("|");
    const hit = key ? communityReady.get(key) : undefined;
    if (hit) {
      communityReady.delete(key);
      return hit;
    }
    const infl = key ? communityInflight.get(key) : undefined;
    if (infl) {
      await awaitPrefetchWithTimeout(
        infl,
        EXPLORE_FEED_PREFETCH_WAIT_TIMEOUT_MS
      );
      const h2 = communityReady.get(key);
      if (h2) {
        communityReady.delete(key);
        return h2;
      }
    }
    return null;
  }

  const trendsIdentity = trendsIdentityFromOpts(opts);
  if (!isUnscopedGlobalTrendsIdentity(trendsIdentity)) {
    return null;
  }

  const ssr = consumeSsrBoot();
  if (ssr) return ssr;

  if (ready && !isBucketStale(ready)) {
    const s = ready;
    ready = null;
    return s;
  }
  if (inflight) {
    await awaitPrefetchWithTimeout(
      inflight,
      EXPLORE_FEED_PREFETCH_WAIT_TIMEOUT_MS
    );
    if (ready && !isBucketStale(ready)) {
      const s = ready;
      ready = null;
      return s;
    }
  }
  return null;
}

/** Warm caches when user is on explore without blocking. */
export function scheduleExploreFeedPrefetchIdle(opts?: {
  communityIds?: string[];
  tvSource?: "tipmanna" | string;
  tvFilters?: {
    eventVideoTypes?: string[];
    language?: string;
    country?: string;
  };
}): void {
  if (typeof window === "undefined") return;
  const tvDeferredAfterStable = isExploreTvPrefetchAfterStableEnabled();
  const run = () => {
    prefetchExploreFeedInitial();
    prefetchExploreSavesFeed();
    if (opts?.communityIds?.length) {
      prefetchExploreCommunityFeed(opts.communityIds);
    }
    if (!tvDeferredAfterStable) {
      import("@/lib/explore-tv-prefetch-cache").then(m => {
        m.scheduleExploreTvPrefetchIdle({
          tvSource: opts?.tvSource,
          ...opts?.tvFilters,
        });
      });
    }
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => run(), { timeout: 4000 });
  } else {
    window.setTimeout(run, 2000);
  }
}
