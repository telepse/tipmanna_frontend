/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getExploreDefaultBucketId } from "@/lib/explore-default-bucket";

const STORAGE_PREFIX = "tipmanna:explore-feed:";

export type ExploreFeedSessionKeyParams = {
  feedMode: "trends" | "saves" | "community";
  communityIds?: string[];
  trendsFilters?: {
    eventTypes: string[];
    language: string;
    country: string;
  };
};

export type ExploreFeedSessionSnapshot = {
  items: any[];
  seed?: string;
  activeIndex: number;
  scrollTop?: number;
  bucketId?: number;
};

function buildExploreFeedSessionKey(
  params: ExploreFeedSessionKeyParams
): string {
  const { feedMode, communityIds, trendsFilters } = params;
  const parts: string[] = [feedMode];

  if (feedMode === "trends") {
    parts.push(`b:${getExploreDefaultBucketId()}`);
  }

  if (feedMode === "community" && communityIds?.length) {
    parts.push([...communityIds].sort().join(","));
  }

  if (feedMode === "trends" && trendsFilters) {
    const types = [...trendsFilters.eventTypes].sort().join(",");
    if (types) parts.push(`t:${types}`);
    const lang = trendsFilters.language?.trim();
    if (lang) parts.push(`l:${lang}`);
    const country = trendsFilters.country?.trim();
    if (country) parts.push(`c:${country}`);
  }

  return `${STORAGE_PREFIX}${parts.join("|")}`;
}

export function restoreExploreFeedSession(
  params: ExploreFeedSessionKeyParams
): ExploreFeedSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(
      buildExploreFeedSessionKey(params)
    );
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
  snapshot: ExploreFeedSessionSnapshot
): void {
  if (typeof window === "undefined") return;
  if (!snapshot.items?.length) return;
  try {
    const payload: ExploreFeedSessionSnapshot = {
      ...snapshot,
      ...(params.feedMode === "trends"
        ? { bucketId: getExploreDefaultBucketId() }
        : {}),
    };
    window.sessionStorage.setItem(
      buildExploreFeedSessionKey(params),
      JSON.stringify(payload)
    );
  } catch {
    /* quota */
  }
}

export function clearExploreFeedSession(
  params: ExploreFeedSessionKeyParams
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(buildExploreFeedSessionKey(params));
  } catch {
    /* ignore */
  }
}
