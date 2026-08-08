/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  getChannelCommentDrawerAction,
  getTipsDrawerAction,
  type CommentDrawerData,
} from "@/actions/messages";
import {
  getSavedVideosForTipper,
  getTippedEventsForTipper,
  getTippedEventsForVisitor,
  getTotalAmountTippedByTipper,
  getTotalAmountTippedByVisitor,
  getMyTippedVideos,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import {
  getHostCreatorPublicProfileAction,
  type HostCreatorPublicProfile,
} from "@/actions/host-creator";
import { fetchSavedHostsMe } from "@/lib/save-host-client";
import { getAuthToken, getAuthUserFromCookies } from "@/lib/getAuthToken";
import { normalizeSavedVideosList } from "@/lib/save-video-client";
import type { TipFeedRow } from "@/components/events/tips-feed-panel";

export type TipsDrawerSnapshot = {
  items: TipFeedRow[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

const SESSION_PREFIX = "tipmanna_drawer_v1:";
const SESSION_TTL_MS = 30 * 60 * 1000;

const commentCache = new Map<string, CommentDrawerData>();
const tipsCache = new Map<string, TipsDrawerSnapshot>();
const profileCache = new Map<string, unknown>();
const creatorProfileCache = new Map<string, HostCreatorPublicProfile>();

const commentInflight: Map<
  string,
  Promise<CommentDrawerData | null>
> = new Map();
const tipsInflight: Map<string, Promise<TipsDrawerSnapshot | null>> = new Map();
const creatorProfileInflight: Map<
  string,
  Promise<HostCreatorPublicProfile | null>
> = new Map();

export function normalizeCreatorUsername(
  username: string | null | undefined
): string {
  return (username ?? "").trim().replace(/^@/, "").toLowerCase();
}

export function creatorProfileKey(username: string) {
  return `creator:${normalizeCreatorUsername(username)}`;
}

function readSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    if (Date.now() - parsed.at > SESSION_TTL_MS) {
      sessionStorage.removeItem(`${SESSION_PREFIX}${key}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSession<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${SESSION_PREFIX}${key}`,
      JSON.stringify({ at: Date.now(), data })
    );
  } catch {
    /* quota */
  }
}

export function commentDrawerKey(eventId: string, channelId: string) {
  return `comment:${eventId.trim()}:${channelId.trim()}`;
}

export function tipsDrawerKey(
  eventId: string,
  channelId: string | null,
  scope: "event" | "video"
) {
  return `tips:${eventId.trim()}:${scope}:${channelId?.trim() ?? ""}`;
}

function scheduleIdle(fn: () => void) {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    requestIdleCallback?: (
      cb: () => void,
      opts?: { timeout?: number }
    ) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(() => fn(), { timeout: 2500 });
  } else {
    window.setTimeout(fn, 400);
  }
}

export function getCachedCommentDrawer(
  eventId: string,
  channelId: string
): CommentDrawerData | null {
  const key = commentDrawerKey(eventId, channelId);
  return commentCache.get(key) ?? readSession<CommentDrawerData>(key);
}

export function getCachedTipsDrawer(
  eventId: string,
  channelId: string | null,
  scope: "event" | "video"
): TipsDrawerSnapshot | null {
  const key = tipsDrawerKey(eventId, channelId, scope);
  return tipsCache.get(key) ?? readSession<TipsDrawerSnapshot>(key);
}

export function getCachedCreatorProfile(
  username: string
): HostCreatorPublicProfile | null {
  const handle = normalizeCreatorUsername(username);
  if (!handle) return null;
  const key = creatorProfileKey(handle);
  return (
    creatorProfileCache.get(key) ?? readSession<HostCreatorPublicProfile>(key)
  );
}

export async function fetchCreatorProfileCached(
  username: string,
  opts?: { force?: boolean }
): Promise<HostCreatorPublicProfile | null> {
  const handle = normalizeCreatorUsername(username);
  if (!handle) return null;
  const key = creatorProfileKey(handle);
  if (!opts?.force) {
    const hit = getCachedCreatorProfile(handle);
    if (hit) return hit;
  }
  let inflight = creatorProfileInflight.get(key);
  if (!inflight) {
    inflight = getHostCreatorPublicProfileAction(handle).then(res => {
      if (res.success && res.data) {
        creatorProfileCache.set(key, res.data);
        writeSession(key, res.data);
        return res.data;
      }
      return null;
    });
    creatorProfileInflight.set(key, inflight);
    void inflight.finally(() => creatorProfileInflight.delete(key));
  }
  return inflight;
}

export function prefetchCreatorProfile(username: string | null | undefined) {
  const handle = normalizeCreatorUsername(username);
  if (!handle) return;
  scheduleIdle(() => {
    void fetchCreatorProfileCached(handle);
  });
}

export async function awaitCreatorProfilePrefetch(username: string) {
  return fetchCreatorProfileCached(username);
}

export async function fetchCommentDrawerCached(
  eventId: string,
  channelId: string,
  opts?: { force?: boolean }
): Promise<CommentDrawerData | null> {
  const key = commentDrawerKey(eventId, channelId);
  if (!opts?.force) {
    const hit = getCachedCommentDrawer(eventId, channelId);
    if (hit) return hit;
  }
  let inflight = commentInflight.get(key);
  if (!inflight) {
    inflight = getChannelCommentDrawerAction(eventId, channelId).then(res => {
      if (res.success && res.data) {
        commentCache.set(key, res.data);
        writeSession(key, res.data);
        return res.data;
      }
      return null;
    });
    commentInflight.set(key, inflight);
    void inflight.finally(() => commentInflight.delete(key));
  }
  return inflight;
}

export async function fetchTipsDrawerCached(
  eventId: string,
  channelId: string | null,
  scope: "event" | "video",
  opts?: {
    force?: boolean;
    cursor?: string | null;
    limit?: number;
    append?: boolean;
  }
): Promise<TipsDrawerSnapshot | null> {
  const key = tipsDrawerKey(eventId, channelId, scope);
  const pageKey = opts?.cursor ? `${key}:${opts.cursor}` : key;

  if (!opts?.force && !opts?.cursor) {
    const hit = getCachedTipsDrawer(eventId, channelId, scope);
    if (hit) return hit;
  }

  let inflight = tipsInflight.get(pageKey);
  if (!inflight) {
    inflight = getTipsDrawerAction(eventId, channelId, scope, undefined, {
      cursor: opts?.cursor ?? null,
      limit: opts?.limit ?? 30,
    }).then(res => {
      if (res.success && res.data && typeof res.data === "object") {
        const data = res.data as {
          items?: TipFeedRow[];
          nextCursor?: string | null;
          hasMore?: boolean;
        };
        const pageItems = Array.isArray(data.items) ? data.items : [];
        const prev = opts?.append
          ? getCachedTipsDrawer(eventId, channelId, scope)
          : null;
        const snap: TipsDrawerSnapshot = {
          items: prev ? [...prev.items, ...pageItems] : pageItems,
          nextCursor: data.nextCursor ?? null,
          hasMore: Boolean(data.hasMore),
        };
        tipsCache.set(key, snap);
        writeSession(key, snap);
        return snap;
      }
      return null;
    });
    tipsInflight.set(pageKey, inflight);
    void inflight.finally(() => tipsInflight.delete(pageKey));
  }
  return inflight;
}

export function invalidateCommentDrawer(eventId: string, channelId: string) {
  const key = commentDrawerKey(eventId, channelId);
  commentCache.delete(key);
  try {
    sessionStorage.removeItem(`${SESSION_PREFIX}${key}`);
  } catch {
    /* noop */
  }
}

export function invalidateTipsDrawer(
  eventId: string,
  channelId: string | null,
  scope?: "event" | "video"
) {
  const keys = scope
    ? [tipsDrawerKey(eventId, channelId, scope)]
    : [
        tipsDrawerKey(eventId, channelId, "event"),
        tipsDrawerKey(eventId, channelId, "video"),
      ];
  for (const key of keys) {
    tipsCache.delete(key);
    try {
      sessionStorage.removeItem(`${SESSION_PREFIX}${key}`);
    } catch {
      /* noop */
    }
  }
}

export async function awaitCommentDrawerPrefetch(
  eventId: string,
  channelId: string
) {
  return fetchCommentDrawerCached(eventId, channelId);
}

export async function awaitTipsDrawerPrefetch(
  eventId: string,
  channelId: string | null,
  scope: "event" | "video" = "event"
) {
  return fetchTipsDrawerCached(eventId, channelId, scope);
}

export async function awaitProfileDrawerPrefetch() {
  return prefetchProfileDrawerData();
}

/** Warm tips payloads for TV schedule rows (current + upcoming). */
export function prefetchTvScheduleTips(
  rows: Array<{
    channel?: { id?: string; eventId?: string };
    defaultChannelEventId?: string;
  }>,
  startIndex = 0,
  count = 3
) {
  if (typeof window === "undefined") return;
  scheduleIdle(() => {
    for (
      let i = startIndex;
      i < Math.min(rows.length, startIndex + count);
      i++
    ) {
      const row = rows[i];
      const eventId = String(
        row?.defaultChannelEventId ?? row?.channel?.eventId ?? ""
      ).trim();
      const channelId =
        row?.channel?.id != null ? String(row.channel.id) : null;
      if (!eventId) continue;
      void fetchTipsDrawerCached(eventId, channelId, "event");
    }
  });
}

/** Warm drawer payloads after the user is viewing a video. */
export function prefetchChannelDrawers(input: {
  eventId: string;
  channelId: string;
  authenticated: boolean;
}) {
  const { eventId, channelId, authenticated } = input;
  if (!eventId?.trim() || !channelId?.trim()) return;
  scheduleIdle(() => {
    void fetchCommentDrawerCached(eventId, channelId);
    void fetchTipsDrawerCached(eventId, channelId, "event");
    if (authenticated) {
      void prefetchProfileDrawerData();
    }
  });
}

export async function prefetchProfileDrawerData(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;
  const authUser = getAuthUserFromCookies();
  const isVisitor = authUser?.role?.toUpperCase() === "VISITOR";
  const key =
    isVisitor && authUser?.id
      ? `profile-drawer-visitor-${authUser.id}`
      : "profile-drawer";
  if (profileCache.has(key)) return;
  const [causesRes, eventsRes, tippedRes, savedRes, videosRes, hosts] =
    await Promise.all([
      getAllCausesAction(),
      isVisitor
        ? getTippedEventsForVisitor(token)
        : getTippedEventsForTipper(token),
      isVisitor
        ? getTotalAmountTippedByVisitor(token)
        : getTotalAmountTippedByTipper(token),
      isVisitor
        ? Promise.resolve({ success: true, data: [] })
        : getSavedVideosForTipper(token),
      getMyTippedVideos(token),
      isVisitor ? Promise.resolve([]) : fetchSavedHostsMe(),
    ]);
  profileCache.set(key, {
    causes:
      causesRes.success && Array.isArray(causesRes.data) ? causesRes.data : [],
    tipperEvents:
      eventsRes.success && Array.isArray(eventsRes.data) ? eventsRes.data : [],
    iTipped: typeof tippedRes.data === "number" ? tippedRes.data : 0,
    savedContents: savedRes.success
      ? normalizeSavedVideosList(savedRes.data)
      : [],
    tippedVideos:
      videosRes.success && Array.isArray(videosRes.data) ? videosRes.data : [],
    savedHosts: hosts,
  });
  writeSession(key, profileCache.get(key));
}

export function getCachedProfileDrawerData(
  cacheKey = "profile-drawer"
): Record<string, any> | null {
  return (
    (profileCache.get(cacheKey) as Record<string, any>) ??
    readSession<Record<string, any>>(cacheKey)
  );
}

export function invalidateProfileDrawerCache() {
  profileCache.delete("profile-drawer");
  for (const k of [...profileCache.keys()]) {
    if (k.startsWith("profile-drawer-visitor-")) {
      profileCache.delete(k);
    }
  }
  try {
    sessionStorage.removeItem(`${SESSION_PREFIX}profile-drawer`);
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.includes("profile-drawer-visitor-")) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {
    /* noop */
  }
}

export function hydrateSavedContentsFromProfileCache(): any[] {
  const cached = getCachedProfileDrawerData();
  return Array.isArray(cached?.savedContents) ? cached.savedContents : [];
}
