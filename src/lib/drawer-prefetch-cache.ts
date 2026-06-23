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
  getTotalAmountTippedByTipper,
  getMyTippedVideos,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import { fetchSavedHostsMe } from "@/lib/save-host-client";
import { getAuthToken } from "@/lib/getAuthToken";
import { normalizeSavedVideosList } from "@/lib/save-video-client";
import type { TipFeedRow } from "@/components/events/tips-feed-panel";

type TipsDrawerSnapshot = { items: TipFeedRow[] };

const commentCache = new Map<string, CommentDrawerData>();
const tipsCache = new Map<string, TipsDrawerSnapshot>();
const profileCache = new Map<string, unknown>();

let commentInflight: Map<string, Promise<CommentDrawerData | null>> = new Map();
let tipsInflight: Map<string, Promise<TipsDrawerSnapshot | null>> = new Map();

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
  return commentCache.get(commentDrawerKey(eventId, channelId)) ?? null;
}

export function getCachedTipsDrawer(
  eventId: string,
  channelId: string | null,
  scope: "event" | "video"
): TipsDrawerSnapshot | null {
  return tipsCache.get(tipsDrawerKey(eventId, channelId, scope)) ?? null;
}

export async function fetchCommentDrawerCached(
  eventId: string,
  channelId: string,
  opts?: { force?: boolean }
): Promise<CommentDrawerData | null> {
  const key = commentDrawerKey(eventId, channelId);
  if (!opts?.force) {
    const hit = commentCache.get(key);
    if (hit) return hit;
  }
  let inflight = commentInflight.get(key);
  if (!inflight) {
    inflight = getChannelCommentDrawerAction(eventId, channelId).then(res => {
      if (res.success && res.data) {
        commentCache.set(key, res.data);
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
  opts?: { force?: boolean }
): Promise<TipsDrawerSnapshot | null> {
  const key = tipsDrawerKey(eventId, channelId, scope);
  if (!opts?.force) {
    const hit = tipsCache.get(key);
    if (hit) return hit;
  }
  let inflight = tipsInflight.get(key);
  if (!inflight) {
    inflight = getTipsDrawerAction(eventId, channelId, scope).then(res => {
      if (res.success && res.data && typeof res.data === "object") {
        const data = res.data as { items?: TipFeedRow[] };
        const snap = {
          items: Array.isArray(data.items) ? data.items : [],
        };
        tipsCache.set(key, snap);
        return snap;
      }
      return null;
    });
    tipsInflight.set(key, inflight);
    void inflight.finally(() => tipsInflight.delete(key));
  }
  return inflight;
}

export function invalidateCommentDrawer(eventId: string, channelId: string) {
  commentCache.delete(commentDrawerKey(eventId, channelId));
}

export function invalidateTipsDrawer(
  eventId: string,
  channelId: string | null,
  scope?: "event" | "video"
) {
  if (scope) {
    tipsCache.delete(tipsDrawerKey(eventId, channelId, scope));
    return;
  }
  tipsCache.delete(tipsDrawerKey(eventId, channelId, "event"));
  tipsCache.delete(tipsDrawerKey(eventId, channelId, "video"));
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
    for (let i = startIndex; i < Math.min(rows.length, startIndex + count); i++) {
      const row = rows[i];
      const eventId = String(
        row?.defaultChannelEventId ?? row?.channel?.eventId ?? ""
      ).trim();
      const channelId =
        row?.channel?.id != null ? String(row.channel.id) : null;
      if (!eventId) continue;
      void fetchTipsDrawerCached(eventId, channelId, "event");
      if (channelId) {
        void fetchTipsDrawerCached(eventId, channelId, "video");
      }
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
    void fetchTipsDrawerCached(eventId, channelId, "video");
    if (authenticated) {
      void prefetchProfileDrawerData();
    }
  });
}

export async function prefetchProfileDrawerData(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;
  const key = "profile-drawer";
  if (profileCache.has(key)) return;
  const [causesRes, eventsRes, tippedRes, savedRes, videosRes, hosts] =
    await Promise.all([
      getAllCausesAction(),
      getTippedEventsForTipper(token),
      getTotalAmountTippedByTipper(token),
      getSavedVideosForTipper(token),
      getMyTippedVideos(token),
      fetchSavedHostsMe(),
    ]);
  profileCache.set(key, {
    causes: causesRes.success && Array.isArray(causesRes.data) ? causesRes.data : [],
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
}

export function getCachedProfileDrawerData(): Record<string, any> | null {
  return (profileCache.get("profile-drawer") as Record<string, any>) ?? null;
}

export function invalidateProfileDrawerCache() {
  profileCache.delete("profile-drawer");
}
