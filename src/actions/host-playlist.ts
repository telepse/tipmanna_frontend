"use server";

import { revalidatePath } from "next/cache";

import { getContentChannelAction } from "@/actions/contents";
import { unwrapContentChannelRows } from "@/lib/content-channel-rows";
import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

const base = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export type HostPlaylistKind = "standard" | "community";

export type HostPlaylistItemInput = {
  eventChannelId: string;
  sortOrder?: number;
};

export type HostPlaylistItem = {
  id: string;
  sortOrder: number;
  eventChannelId: string;
  title: string;
  url: string;
  numOfTips: number;
  event: {
    id: string;
    eventName: string;
    eventSlug: string | null;
  };
};

export type HostPlaylistSummary = {
  id: string;
  name: string;
  description: string | null;
  bannerUrl: string | null;
  kind: HostPlaylistKind;
  communityId: string | null;
  communityName: string | null;
  pageVisitCount: number;
  createdAt: string;
  updatedAt: string;
  videoCount: number;
  totalTips: number;
  totalTipCount: number;
  totalEncounters: number;
  totalShares: number;
  totalComments: number;
  totalSaves: number;
  host: {
    id: string;
    username: string;
    fullName: string;
  };
  items?: HostPlaylistItem[];
  imageUrl?: string | null;
  landingUrl?: string;
};

export type DiscoveryPlaylistRow = HostPlaylistSummary & {
  imageUrl: string | null;
  landingUrl: string;
};

export async function listHostPlaylistsAction() {
  return runServerFetch<{ playlists: HostPlaylistSummary[] }>(
    `${base()}/host/playlists`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listHostPlaylistsAction",
    raw => {
      const o = raw as { playlists?: HostPlaylistSummary[] };
      return { playlists: Array.isArray(o.playlists) ? o.playlists : [] };
    }
  );
}

export async function getHostPlaylistAction(id: string) {
  return runServerFetch<HostPlaylistSummary>(
    `${base()}/host/playlists/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostPlaylistAction"
  );
}

export async function createHostPlaylistAction(body: {
  name: string;
  description?: string | null;
  bannerUrl?: string | null;
  kind?: HostPlaylistKind;
  communityId?: string | null;
  items: HostPlaylistItemInput[];
}) {
  const result = await runServerFetch<{ playlist: HostPlaylistSummary }>(
    `${base()}/host/playlists`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await serverHostAuthHeaders()),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "createHostPlaylistAction"
  );
  if (result.success) revalidatePath("/host");
  return result;
}

export async function updateHostPlaylistAction(
  id: string,
  body: {
    name?: string;
    description?: string | null;
    bannerUrl?: string | null;
    items?: HostPlaylistItemInput[];
  }
) {
  const result = await runServerFetch<{ playlist: HostPlaylistSummary }>(
    `${base()}/host/playlists/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await serverHostAuthHeaders()),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "updateHostPlaylistAction"
  );
  if (result.success) {
    revalidatePath("/host");
    revalidatePath(`/playlist/${id}`);
  }
  return result;
}

export async function deleteHostPlaylistAction(id: string) {
  const result = await runServerFetch<{ ok: boolean }>(
    `${base()}/host/playlists/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "deleteHostPlaylistAction"
  );
  if (result.success) revalidatePath("/host");
  return result;
}

export async function getPublicPlaylistAction(
  id: string,
  token?: string | null
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return runServerFetch<{
    playlist: HostPlaylistSummary;
    locked?: boolean;
    requiresMembership?: boolean;
  }>(
    `${base()}/playlists/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
    "getPublicPlaylistAction",
    raw => {
      const o = raw as {
        playlist?: HostPlaylistSummary;
        locked?: boolean;
        requiresMembership?: boolean;
      };
      if (!o.playlist) throw new Error("Playlist not found");
      return {
        playlist: o.playlist,
        locked: Boolean(o.locked),
        requiresMembership: Boolean(o.requiresMembership),
      };
    }
  );
}

export async function postPlaylistVisitAction(id: string, path: string) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/playlists/${encodeURIComponent(id)}/visit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      cache: "no-store",
    },
    "postPlaylistVisitAction"
  );
}

export async function postPlaylistPlayAllClickAction(id: string) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/playlists/${encodeURIComponent(id)}/play-all-click`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "postPlaylistPlayAllClickAction"
  );
}

export async function getDiscoveryPlaylistsAction(limit = 20) {
  const bounded = Math.max(1, Math.min(40, limit));
  return runServerFetch<DiscoveryPlaylistRow[]>(
    `${base()}/contents/playlists/discovery?limit=${bounded}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 300 },
    },
    "getDiscoveryPlaylistsAction",
    raw => (Array.isArray(raw) ? raw : []) as DiscoveryPlaylistRow[]
  );
}

/** Build ordered playable rows for playlist “watch all” on the content client. */
export async function resolveHostPlaylistWatchAll(
  playlistId: string,
  authToken?: string | null
): Promise<{ playlist: unknown[]; canonicalEventId: string } | null> {
  const res = await getPublicPlaylistAction(playlistId, authToken ?? null);
  if (!res.success || !res.data || res.data.locked) return null;
  const items = res.data.playlist.items ?? [];
  if (items.length === 0) return null;

  const distinctEventIds = [...new Set(items.map(i => i.event.id))];
  const byEventId: Record<string, unknown[]> = {};

  await Promise.all(
    distinctEventIds.map(async evId => {
      const channelRes = await getContentChannelAction(evId, authToken ?? null);
      byEventId[evId] = channelRes.success
        ? unwrapContentChannelRows(channelRes.data)
        : [];
    })
  );

  const playlist: unknown[] = [];
  for (const item of items) {
    const rows = byEventId[item.event.id];
    const fallbackRow = item.url?.trim()
      ? {
          id: item.eventChannelId,
          title: item.title,
          url: item.url,
          numOfTips: item.numOfTips,
          event: {
            id: item.event.id,
            eventName: item.event.eventName,
          },
        }
      : null;

    if (!rows?.length) {
      if (fallbackRow) playlist.push(fallbackRow);
      continue;
    }

    const row = rows.find(
      r =>
        typeof r === "object" &&
        r !== null &&
        String((r as { id?: unknown }).id ?? "") === String(item.eventChannelId)
    ) as Record<string, unknown> | undefined;

    if (
      row &&
      typeof row === "object" &&
      row.restricted !== true &&
      typeof row.url === "string" &&
      row.url.trim()
    ) {
      playlist.push(row);
      continue;
    }

    if (fallbackRow) playlist.push(fallbackRow);
  }

  if (playlist.length === 0) return null;
  return {
    playlist,
    canonicalEventId: String(items[0].event.id),
  };
}
