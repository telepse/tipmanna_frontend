/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { fetchTvScheduleAction } from "@/actions/tv-schedule";

export type ExploreTvPrefetchSnapshot = {
  ongoing: any[];
  upcoming: any[];
  ongoingLabel: string;
  upcomingLabel: string;
  broadcastEpoch?: number;
  filterKey: string;
};

let ready: ExploreTvPrefetchSnapshot | null = null;
let inflight: Promise<ExploreTvPrefetchSnapshot | null> | null = null;

function buildFilterKey(f?: {
  tvSource?: string;
  eventVideoTypes?: string[];
  language?: string;
  country?: string;
}): string {
  return JSON.stringify({
    src: f?.tvSource ?? "tipmanna",
    t: f?.eventVideoTypes ?? [],
    l: f?.language ?? "",
    c: f?.country ?? "",
  });
}

function buildTvScheduleQuery(f?: {
  eventVideoTypes?: string[];
  language?: string;
  country?: string;
}): string {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.eventVideoTypes?.length) {
    p.set("eventVideoTypes", f.eventVideoTypes.join(","));
  }
  if (f.language?.trim()) p.set("language", f.language.trim());
  if (f.country?.trim()) p.set("country", f.country.trim());
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function fetchTvSnapshot(opts?: {
  tvSource?: "tipmanna" | string;
  eventVideoTypes?: string[];
  language?: string;
  country?: string;
}): Promise<ExploreTvPrefetchSnapshot | null> {
  const tvSource = opts?.tvSource ?? "tipmanna";
  const filterKey = buildFilterKey({ ...opts, tvSource });
  const q = buildTvScheduleQuery(opts);
  const res = await fetchTvScheduleAction({
    communityId: tvSource !== "tipmanna" ? tvSource : null,
    query: q ? q.replace(/^\?/, "") : undefined,
  });
  if (!res.success || !res.data?.body) return null;
  const data = res.data.body as {
    ongoingLabel?: string;
    upcomingLabel?: string;
    items?: unknown[];
    alternateBatchItems?: unknown[];
    broadcastEpoch?: number;
  };
  return {
    ongoing: Array.isArray(data.items) ? data.items : [],
    upcoming: Array.isArray(data.alternateBatchItems)
      ? data.alternateBatchItems
      : [],
    ongoingLabel: data.ongoingLabel ?? "On air now",
    upcomingLabel: data.upcomingLabel ?? "Next 12 hours",
    broadcastEpoch:
      typeof data.broadcastEpoch === "number" ? data.broadcastEpoch : undefined,
    filterKey,
  };
}

export function prefetchExploreTvSchedule(opts?: {
  tvSource?: "tipmanna" | string;
  eventVideoTypes?: string[];
  language?: string;
  country?: string;
}): void {
  if (typeof window === "undefined") return;
  const filterKey = buildFilterKey({
    ...opts,
    tvSource: opts?.tvSource ?? "tipmanna",
  });
  if (ready?.filterKey === filterKey) return;
  if (inflight) return;
  inflight = (async () => {
    try {
      const snap = await fetchTvSnapshot(opts);
      if (snap) ready = snap;
      return snap;
    } finally {
      inflight = null;
    }
  })();
}

export function takeExploreTvPrefetch(
  filterKey: string
): ExploreTvPrefetchSnapshot | null {
  if (ready?.filterKey === filterKey) {
    const s = ready;
    ready = null;
    return s;
  }
  return null;
}

export async function waitExploreTvPrefetch(
  filterKey: string
): Promise<ExploreTvPrefetchSnapshot | null> {
  if (ready?.filterKey === filterKey) {
    const s = ready;
    ready = null;
    return s;
  }
  if (inflight) {
    await inflight;
    if (ready?.filterKey === filterKey) {
      const s = ready;
      ready = null;
      return s;
    }
  }
  return null;
}

export function scheduleExploreTvPrefetchIdle(opts?: {
  tvSource?: "tipmanna" | string;
  eventVideoTypes?: string[];
  language?: string;
  country?: string;
}): void {
  if (typeof window === "undefined") return;
  const run = () => prefetchExploreTvSchedule(opts);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => run(), { timeout: 5000 });
  } else {
    window.setTimeout(run, 2500);
  }
}
