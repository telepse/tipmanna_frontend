"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { fetchTvScheduleAction } from "@/actions/tv-schedule";
import {
  buildTvPagePath,
  persistTvSourceCommunityId,
} from "@/lib/tv-source-navigation";
import { persistTvScheduleSessionCache } from "@/lib/tv-schedule-session-cache";
import { requestTvYoutubeApiWarmup } from "@/lib/tv-youtube-api-warmup";

export type ExploreWatchTvSource = "tipmanna" | string;

function resolveCommunityId(tvSource: ExploreWatchTvSource): string | null {
  const src = tvSource?.trim() || "tipmanna";
  return src === "tipmanna" ? null : src;
}

let prefetchInflight: Promise<void> | null = null;
let lastPrefetchKey = "";

function buildScheduleQuery(opts?: {
  eventVideoTypes?: string[];
  language?: string;
  country?: string;
}): string | undefined {
  if (!opts) return undefined;
  const p = new URLSearchParams();
  if (opts.eventVideoTypes?.length) {
    p.set("eventVideoTypes", opts.eventVideoTypes.join(","));
  }
  if (opts.language?.trim()) p.set("language", opts.language.trim());
  if (opts.country?.trim()) p.set("country", opts.country.trim());
  const s = p.toString();
  return s || undefined;
}

/** Hover/focus prefetch: route, YT API, and schedule session cache for /tv. */
export function prefetchWatchTvFromExplore(
  router: AppRouterInstance,
  tvSource: ExploreWatchTvSource = "tipmanna",
  filters?: {
    eventVideoTypes?: string[];
    language?: string;
    country?: string;
  }
): void {
  if (typeof window === "undefined") return;
  const communityId = resolveCommunityId(tvSource);
  const path = buildTvPagePath(communityId);
  const key = `${path}|${JSON.stringify(filters ?? {})}`;
  if (prefetchInflight && lastPrefetchKey === key) return;
  lastPrefetchKey = key;

  try {
    router.prefetch(path);
  } catch {
    /* noop */
  }
  requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });

  prefetchInflight = (async () => {
    try {
      const res = await fetchTvScheduleAction({
        communityId,
        query: buildScheduleQuery(filters),
      });
      if (res.success && res.data?.body) {
        persistTvScheduleSessionCache(
          res.data.body,
          res.data.etag ?? null,
          communityId
        );
      }
    } finally {
      prefetchInflight = null;
    }
  })();
}

/** Navigate to /tv immediately; prefetch may still be warming in background. */
export function openWatchTvFromExplore(
  router: AppRouterInstance,
  tvSource: ExploreWatchTvSource = "tipmanna"
): void {
  const communityId = resolveCommunityId(tvSource);
  persistTvSourceCommunityId(communityId);
  router.push(buildTvPagePath(communityId));
}
