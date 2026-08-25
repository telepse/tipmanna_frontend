import { unwrapPaginatedList } from "@/lib/unwrap-paginated-list";
import { normalizeListPayload } from "@/lib/list-response-normalizer";
import type { Event } from "@/types/event.types";
import type { KeyStat } from "@/types/keystat.types";
import type { CommunityExploreCatalogRow } from "@/actions/communities";

const REVALIDATE_SECONDS = 300;
const CACHE_TAG = "partner-sections";

type FeaturedContent = {
  id: string;
  metrics?: Record<string, unknown>;
  event?: {
    id: string;
    eventBanner?: string;
    hostName?: string;
    username?: string;
    amountRaised?: number;
    numOfTips?: number;
    startTime?: string;
    endTime?: string;
  };
  url?: string;
  title?: string;
  durationSeconds?: number;
  [key: string]: unknown;
};

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "") ??
    "http://localhost:5000/api"
  );
}

async function cachedGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function cachedPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function defaultKeyStat(): KeyStat {
  return {
    totalTipsReceived: 0,
    successfulTransactions: 0,
    uniqueTippersAndVisitors: 0,
    activeYoutubeLinks: 0,
    communitiesCreated: 0,
    totalEncounters: 0,
    contentViews: 0,
    lastWeek: {
      totalTipsReceived: 0,
      successfulTransactions: 0,
      activeYoutubeLinks: 0,
      communitiesCreated: 0,
      totalEncounters: 0,
    },
  };
}

export async function fetchPartnerFeaturedEvents(): Promise<Event[]> {
  const raw = await cachedGet<unknown>("/events/featured?limit=100");
  if (!raw) return [];
  return unwrapPaginatedList<Event>(raw);
}

export async function fetchPartnerFeaturedContents(): Promise<
  FeaturedContent[]
> {
  const raw = await cachedGet<unknown>("/contents/featured");
  if (!raw) return [];
  const contents = normalizeListPayload<FeaturedContent>(raw);
  if (contents.length === 0) return [];

  const metricsRes = await cachedPost<{
    metrics?: Record<string, Record<string, unknown>>;
  }>("/contents/channels/metrics/batch", {
    channelIds: contents.map(item => item.id),
  });

  const metricsMap = metricsRes?.metrics ?? {};
  return contents
    .filter(item => item.event?.id)
    .map(item => {
      const rawMetrics = metricsMap[item.id];
      if (rawMetrics && !("restricted" in rawMetrics)) {
        return { ...item, metrics: rawMetrics };
      }
      return item;
    });
}

export async function fetchPartnerTopCommunities(): Promise<
  CommunityExploreCatalogRow[]
> {
  const raw = await cachedGet<{
    communities?: CommunityExploreCatalogRow[];
  }>("/communities/top?limit=3");
  return raw?.communities ?? [];
}

export async function fetchPartnerImpactStats(): Promise<KeyStat | null> {
  const raw = await cachedGet<Record<string, unknown>>("/impact-in-numbers");
  if (!raw || typeof raw !== "object") return null;

  const n = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const lastWeekRaw = raw.lastWeek as Record<string, unknown> | undefined;

  return {
    totalTipsReceived: n(raw.totalTipsReceived),
    successfulTransactions: n(raw.successfulTransactions),
    uniqueTippersAndVisitors: n(
      raw.uniqueTippersAndVisitors ?? raw.uniqueTippers
    ),
    activeYoutubeLinks: n(raw.activeYoutubeLinks),
    communitiesCreated: n(raw.communitiesCreated),
    totalEncounters: n(raw.totalEncounters),
    contentViews: n(raw.contentViewsOver10Seconds ?? raw.contentViews),
    lastWeek: {
      totalTipsReceived: n(lastWeekRaw?.totalTipsReceived),
      successfulTransactions: n(lastWeekRaw?.successfulTransactions),
      activeYoutubeLinks: n(lastWeekRaw?.activeYoutubeLinks),
      communitiesCreated: n(lastWeekRaw?.communitiesCreated),
      totalEncounters: n(lastWeekRaw?.totalEncounters),
    },
  };
}

export function isKeyStatEmpty(stats: KeyStat): boolean {
  return (
    stats.totalTipsReceived === 0 &&
    stats.successfulTransactions === 0 &&
    stats.uniqueTippersAndVisitors === 0 &&
    stats.activeYoutubeLinks === 0 &&
    stats.communitiesCreated === 0 &&
    stats.totalEncounters === 0 &&
    stats.contentViews === 0
  );
}

export { defaultKeyStat };
