/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { runServerFetch, type ServerActionFetchInit } from "@/lib/action-fetch";
import {
  EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS,
  EXPLORE_FEED_PAGINATION_FETCH_TIMEOUT_MS,
  EXPLORE_FEED_PAGINATION_TOTAL_DEADLINE_MS,
} from "@/lib/explore-feed-fetch-timeout";
import { runExplorePaginationServerFetch } from "@/lib/explore-feed-pagination-fetch";
import { DISCOVERY_PROGRAMS_DISPLAY_LIMIT } from "@/lib/discover-programs";
import { normalizeListPayload } from "@/lib/list-response-normalizer";
import { serverAuthHeaders } from "@/lib/server-auth";

/** Discover/catalog rails — cached with short revalidation for SSR performance. */
const DISCOVER_CATALOG_GET: ServerActionFetchInit = {
  method: "GET",
  headers: { "Content-Type": "application/json" },
  cache: "no-store",
  next: { revalidate: 30 },
};

/** Discover panel latest rail only — always fresh (no HTTP cache). */
const DISCOVER_PANEL_LATEST_GET: ServerActionFetchInit = {
  method: "GET",
  headers: { "Content-Type": "application/json" },
  cache: "no-store",
};

/** Featured rail includes live engagement metrics — bypass Next.js Data Cache. */
const FEATURED_CONTENTS_GET: ServerActionFetchInit = {
  method: "GET",
  headers: { "Content-Type": "application/json" },
  cache: "no-store",
};

// -------- Get latest contents -------- //
export async function getLatestContents() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/latest`,
    DISCOVER_CATALOG_GET,
    "getLatestContents",
    raw => normalizeListPayload(raw)
  );
}

/** Latest contents for DiscoverPanel only (uncached). */
export async function getDiscoverPanelLatestContents() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/latest`,
    DISCOVER_PANEL_LATEST_GET,
    "getDiscoverPanelLatestContents",
    raw => normalizeListPayload(raw)
  );
}

// -------- Get most tipped contents -------- //
export async function getMostTippedContents() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/most-tipped`,
    DISCOVER_CATALOG_GET,
    "getMostTippedContents"
  );
}

// -------- Get tip feed -------- //
export async function getTipFeed(eventId?: string | null) {
  const q =
    eventId?.trim() !== ""
      ? `?eventId=${encodeURIComponent(String(eventId).trim())}`
      : "";
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/tip-feed${q}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getTipFeed"
  );
}

// -------- Save video -------- //
export async function saveVideo(
  channelId: string,
  token?: string | null,
  owner: { hostId?: string; tipperId?: string; visitorId?: string } = {}
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/channels/${channelId}/save`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(owner),
      cache: "no-store",
    },
    "saveVideo"
  );
}

// -------- Unsave (remove) channel for current user -------- //
export async function unsaveChannelVideo(
  channelId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/events/channels/${channelId}/save`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "unsaveChannelVideo"
  );
}

// -------- Get all featured contents -------- //
export async function getAllFeaturedContentsAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/featured`,
    FEATURED_CONTENTS_GET,
    "getAllFeaturedContentsAction",
    raw => normalizeListPayload(raw)
  );
}

export async function getSpotlightContents() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/spotlight`,
    DISCOVER_CATALOG_GET,
    "getSpotlightContents"
  );
}

export async function getRecommendedContents() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/recommended`,
    DISCOVER_CATALOG_GET,
    "getRecommendedContents"
  );
}

export async function getLiveStreamContents() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/live-streams`,
    DISCOVER_CATALOG_GET,
    "getLiveStreamContents"
  );
}

export type DiscoveryEventRow = {
  id: string;
  name: string;
  banner: string | null;
  accessMode: string;
  communityId: string | null;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  organizationName: string | null;
  numOfTips: number | null;
  amountRaised: number | null;
  isArchived?: boolean;
  badge: "unrestricted" | "restricted" | "community" | "archived";
};

export async function getDiscoveryEventsAction(limit = 5) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/discover/events?limit=${limit}`,
    DISCOVER_CATALOG_GET,
    "getDiscoveryEventsAction",
    raw => {
      return (Array.isArray(raw) ? raw : []) as DiscoveryEventRow[];
    }
  );
}

export async function searchContentsAction(
  q: string,
  limit = 30,
  eventType?: string | null
) {
  const query = q.trim();
  const type = eventType?.trim() ?? "";
  if (!query && !type) {
    return { success: true, data: [] as unknown[] };
  }
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("limit", String(limit));
  if (type) params.set("eventType", type);
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/search?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "searchContentsAction",
    raw => normalizeListPayload(raw)
  );
}

export type DiscoverySearchResult = {
  videos: Array<{
    id: string;
    title: string;
    url: string;
    thumbnailUrl: string | null;
    hostName: string;
    communityName: string | null;
    durationSeconds: number | null;
    encounters: number;
    numOfTips: number;
    createdAt: string;
    eventId: string;
  }>;
  programs: Array<{
    id: string;
    title: string;
    imageUrl: string | null;
    tvName: string;
    scheduledAt: string;
    status: string;
    landingUrl: string;
    communityId: string | null;
  }>;
  livestreams: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    hostName: string;
    scheduledAt: string | null;
    liveStatus: string;
    isLive: boolean;
    eventId: string;
  }>;
  communities: Array<{
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    memberCount: number;
    numVideos: number;
    totalTips: number;
    verified: boolean;
  }>;
  events: Array<{
    id: string;
    name: string;
    banner: string | null;
    accessMode: string;
    communityId: string | null;
    eventDate: string | null;
    isArchived: boolean;
    badge: "unrestricted" | "restricted" | "community" | "archived";
  }>;
};

export async function discoverySearchAction(
  q: string,
  limit = 12,
  eventType?: string | null
) {
  const query = q.trim();
  const type = eventType?.trim() ?? "";
  if (!query && !type) {
    return {
      success: true,
      data: {
        videos: [],
        programs: [],
        livestreams: [],
        communities: [],
        events: [],
      } satisfies DiscoverySearchResult,
    };
  }
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set("q", query);
  if (type) params.set("eventType", type);
  return runServerFetch<DiscoverySearchResult>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/discovery-search?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "discoverySearchAction"
  );
}

export async function getDiscoveryProgramsAction(
  limit = DISCOVERY_PROGRAMS_DISPLAY_LIMIT
) {
  const bounded = Math.max(1, Math.min(40, limit));
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/programs/discovery?limit=${bounded}`,
    DISCOVER_CATALOG_GET,
    "getDiscoveryProgramsAction",
    raw => normalizeListPayload(raw)
  );
}

export async function getContentChannelAction(
  eventId: string,
  authToken?: string | null
) {
  const trimmed = eventId.trim();
  const { buildEventRoomRequestHeaders } = await import(
    "@/lib/event-room-request"
  );
  const { getToken } = await import("@/lib/getToken");
  const { getHostToken } = await import("@/lib/getHostToken");
  const roomHeaders = await buildEventRoomRequestHeaders(trimmed);
  const resolvedToken =
    authToken?.trim() || (await getToken()) || (await getHostToken()) || null;
  const authHeaders = await serverAuthHeaders(resolvedToken);
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/channel/${trimmed}`,
    {
      method: "GET",
      headers: { ...roomHeaders, ...authHeaders },
      cache: "no-store",
    },
    "getContentChannelAction"
  );
}

function exploreFeedFilterBody(
  opts?:
    | {
        feedMode?: "trends" | "saves";
        eventVideoTypes?: string[];
        eventTypes?: string[];
        languages?: string[];
        countries?: string[];
        language?: string;
        country?: string;
        includeEndedLive?: boolean;
      }
    | undefined
): Record<string, unknown> {
  if (!opts) return {};
  const types = [
    ...(opts.eventVideoTypes ?? []),
    ...(opts.eventTypes ?? []),
  ].filter(Boolean);
  const uniqTypes = types.length ? [...new Set(types)] : [];
  const langs = [
    ...(opts.languages ?? []),
    ...(opts.language?.trim() ? [opts.language.trim()] : []),
  ].filter(Boolean);
  const cts = [
    ...(opts.countries ?? []),
    ...(opts.country?.trim() ? [opts.country.trim()] : []),
  ].filter(Boolean);
  const out: Record<string, unknown> = {};
  if (uniqTypes.length) out.eventVideoTypes = uniqTypes;
  if (langs.length) out.languages = langs;
  if (cts.length) out.countries = cts;
  if (opts.includeEndedLive) out.includeEndedLive = true;
  return out;
}

export type ExploreFeedBatchData = {
  items: unknown[];
  seed: string;
  savesFeedEligible?: boolean;
  savesFeedReason?: "auth" | "min_saves";
};

/** Multiple explore items in one round-trip; count capped server-side (max 15). */
export async function postExploreFeedBatchAction(
  excludeChannelIds: string[],
  seed: string | undefined,
  count: number,
  authToken?: string | null,
  opts?: {
    feedMode?: "trends" | "saves" | "community";
    communityIds?: string[];
    eventVideoTypes?: string[];
    eventTypes?: string[];
    languages?: string[];
    countries?: string[];
    language?: string;
    country?: string;
    /** Non-sensitive continuation trace for backend stage logging. */
    paginationTraceId?: string;
    paginationAttempt?: number;
  }
) {
  const fm = opts?.feedMode ?? "trends";
  const body: Record<string, unknown> = {
    excludeChannelIds: excludeChannelIds.slice(0, 200),
    count,
    feedMode: fm,
    ...(seed ? { seed } : {}),
    ...exploreFeedFilterBody(opts as any),
  };
  if (opts?.communityIds?.length) {
    body.communityIds = opts.communityIds.slice(0, 50);
  }

  const isContinuation = excludeChannelIds.length > 0;
  const fetchTimeoutMs = isContinuation
    ? EXPLORE_FEED_PAGINATION_TOTAL_DEADLINE_MS
    : EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS;

  const fetchInit = {
    method: "POST" as const,
    headers: {
      ...(await serverAuthHeaders(authToken)),
      ...(isContinuation && opts?.paginationTraceId
        ? { "x-explore-trace-id": opts.paginationTraceId }
        : {}),
      ...(isContinuation && opts?.paginationAttempt != null
        ? { "x-explore-attempt": String(opts.paginationAttempt) }
        : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store" as const,
    perAttemptTimeoutMs: fetchTimeoutMs,
  };

  if (isContinuation) {
    return runExplorePaginationServerFetch<ExploreFeedBatchData>(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/feed/batch`,
      fetchInit,
      "postExploreFeedBatchAction",
      raw => {
        const o = raw as Record<string, unknown>;
        const items = o.items;
        const seedVal = o.seed;
        return {
          items: Array.isArray(items) ? items : [],
          seed: typeof seedVal === "string" ? seedVal : "",
          savesFeedEligible:
            typeof o.savesFeedEligible === "boolean"
              ? o.savesFeedEligible
              : undefined,
          savesFeedReason:
            o.savesFeedReason === "auth" || o.savesFeedReason === "min_saves"
              ? o.savesFeedReason
              : undefined,
        };
      }
    );
  }

  return runServerFetch<ExploreFeedBatchData>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/feed/batch`,
    fetchInit,
    "postExploreFeedBatchAction",
    raw => {
      const o = raw as Record<string, unknown>;
      const items = o.items;
      const seedVal = o.seed;
      return {
        items: Array.isArray(items) ? items : [],
        seed: typeof seedVal === "string" ? seedVal : "",
        savesFeedEligible:
          typeof o.savesFeedEligible === "boolean"
            ? o.savesFeedEligible
            : undefined,
        savesFeedReason:
          o.savesFeedReason === "auth" || o.savesFeedReason === "min_saves"
            ? o.savesFeedReason
            : undefined,
      };
    }
  );
}

export type ExploreChannelMetrics = {
  views: number;
  encounters: number;
  completes: number;
  saves: number;
  shares: number;
  comments: number;
};

export type ExploreChannelMetricsResponse =
  | ExploreChannelMetrics
  | {
      restricted: true;
      community: { id: string; name: string };
    };

export async function getExploreChannelMetricsAction(
  channelId: string,
  authToken?: string | null
) {
  return runServerFetch<ExploreChannelMetricsResponse>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/channels/${encodeURIComponent(channelId)}/metrics`,
    {
      method: "GET",
      headers: await serverAuthHeaders(authToken),
      cache: "no-store",
    },
    "getExploreChannelMetricsAction"
  );
}

export async function getExploreChannelMetricsBatchAction(
  channelIds: string[],
  authToken?: string | null
) {
  return runServerFetch<{
    metrics: Record<string, ExploreChannelMetricsResponse>;
  }>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/channels/metrics/batch`,
    {
      method: "POST",
      headers: {
        ...(await serverAuthHeaders(authToken)),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channelIds }),
      cache: "no-store",
    },
    "getExploreChannelMetricsBatchAction"
  );
}
