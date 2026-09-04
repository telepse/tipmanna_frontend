/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getExploreDefaultBucketId } from "@/lib/explore-default-bucket";

const STORAGE_PREFIX = "tipmanna:explore-feed:v2:";

export type ExploreFeedSessionKeyParams = {
  feedMode: "trends" | "saves" | "community";
  communityIds?: string[];
  trendsFilters?: {
    eventTypes: string[];
    language: string;
    country: string;
    includeEndedLive?: boolean;
  };
};

export type ExploreFeedFetchScope = {
  feedMode: "trends" | "saves" | "community";
  communityIds?: string[];
  eventVideoTypes?: string[];
  language?: string;
  country?: string;
  includeEndedLive?: boolean;
};

export type ExploreFeedIdentity = {
  storageKey: string;
  fetchScope: ExploreFeedFetchScope;
};

export type ExploreFeedSessionSnapshot = {
  items: any[];
  seed?: string;
  activeIndex: number;
  scrollTop?: number;
  bucketId?: number;
};

/** Canonical feed identity: session key, query key, and fetch scope stay aligned. */
export function buildExploreFeedIdentity(
  params: ExploreFeedSessionKeyParams,
  opts?: { hasExploreSession?: boolean }
): ExploreFeedIdentity {
  const { feedMode, communityIds, trendsFilters } = params;
  const parts: string[] = [feedMode];

  if (feedMode === "trends") {
    parts.push(`b:${getExploreDefaultBucketId()}`);
  }

  if (communityIds?.length) {
    parts.push(`comm:${[...communityIds].sort().join(",")}`);
  }

  if (feedMode === "trends" && trendsFilters) {
    const types = [...trendsFilters.eventTypes].sort().join(",");
    if (types) parts.push(`t:${types}`);
    const lang = trendsFilters.language?.trim();
    if (lang) parts.push(`l:${lang}`);
    const country = trendsFilters.country?.trim();
    if (country) parts.push(`c:${country}`);
    if (trendsFilters.includeEndedLive) parts.push("ended:1");
  }

  if (feedMode === "saves" || feedMode === "community") {
    parts.push(`sess:${opts?.hasExploreSession ? "auth" : "anon"}`);
  }

  const storageKey = `${STORAGE_PREFIX}${parts.join("|")}`;

  const fetchScope: ExploreFeedFetchScope = { feedMode };
  if (communityIds?.length) {
    fetchScope.communityIds = [...communityIds];
  }
  if (feedMode === "trends" && trendsFilters) {
    if (trendsFilters.eventTypes.length) {
      fetchScope.eventVideoTypes = [...trendsFilters.eventTypes];
    }
    const lang = trendsFilters.language?.trim();
    if (lang) fetchScope.language = lang;
    const country = trendsFilters.country?.trim();
    if (country) fetchScope.country = country;
    if (trendsFilters.includeEndedLive) {
      fetchScope.includeEndedLive = true;
    }
  }

  return { storageKey, fetchScope };
}

/** True when warm global-trends prefetch/SSR boot matches this identity. */
export function isUnscopedGlobalTrendsIdentity(
  params: ExploreFeedSessionKeyParams
): boolean {
  if (params.feedMode !== "trends") return false;
  if (params.communityIds?.length) return false;
  const f = params.trendsFilters;
  if (!f) return true;
  if (f.eventTypes.length > 0) return false;
  if (f.language?.trim()) return false;
  if (f.country?.trim()) return false;
  if (f.includeEndedLive) return false;
  return true;
}

/** Feed load identity (alias for storageKey — session and query keys are identical). */
export function buildExploreFeedQueryKey(
  params: ExploreFeedSessionKeyParams,
  opts?: { hasExploreSession?: boolean }
): string {
  return buildExploreFeedIdentity(params, opts).storageKey;
}

export function restoreExploreFeedSession(
  params: ExploreFeedSessionKeyParams,
  opts?: { hasExploreSession?: boolean }
): ExploreFeedSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  const { storageKey } = buildExploreFeedIdentity(params, opts);
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExploreFeedSessionSnapshot;
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null;
    }
    if (
      params.feedMode === "trends" &&
      parsed.bucketId != null &&
      parsed.bucketId !== getExploreDefaultBucketId()
    ) {
      return null;
    }
    const activeIndex =
      typeof parsed.activeIndex === "number" && parsed.activeIndex >= 0
        ? parsed.activeIndex
        : 0;
    return {
      items: parsed.items,
      seed: parsed.seed,
      activeIndex,
      scrollTop: parsed.scrollTop,
      bucketId: parsed.bucketId,
    };
  } catch {
    return null;
  }
}

export function persistExploreFeedSession(
  params: ExploreFeedSessionKeyParams,
  snapshot: ExploreFeedSessionSnapshot,
  opts?: { hasExploreSession?: boolean }
): void {
  if (typeof window === "undefined") return;
  if (!snapshot.items?.length) return;
  const { storageKey } = buildExploreFeedIdentity(params, opts);
  try {
    const payload: ExploreFeedSessionSnapshot = {
      ...snapshot,
      ...(params.feedMode === "trends"
        ? { bucketId: getExploreDefaultBucketId() }
        : {}),
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function clearExploreFeedSession(
  params: ExploreFeedSessionKeyParams,
  opts?: { hasExploreSession?: boolean }
): void {
  if (typeof window === "undefined") return;
  const { storageKey } = buildExploreFeedIdentity(params, opts);
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}
