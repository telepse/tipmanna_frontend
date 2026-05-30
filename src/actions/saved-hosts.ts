"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

const base = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export type SavedHostRow = {
  id: string;
  hostId: string;
  createdAt: string;
  host?: {
    id: string;
    fullName: string | null;
    username: string | null;
    profileImage: string | null;
  };
};

export async function fetchSavedHostsMeAction() {
  return runServerFetch<{ hosts: SavedHostRow[] }>(
    `${base()}/saved-hosts/me`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "fetchSavedHostsMeAction",
    raw => {
      const o = raw as { hosts?: SavedHostRow[] };
      return { hosts: Array.isArray(o.hosts) ? o.hosts : [] };
    }
  );
}

export async function fetchSavedHostStatusAction(hostId: string) {
  return runServerFetch<{ saved: boolean }>(
    `${base()}/saved-hosts/${encodeURIComponent(hostId)}/status`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "fetchSavedHostStatusAction",
    raw => {
      const o = raw as { saved?: boolean };
      return { saved: Boolean(o.saved) };
    }
  );
}

export async function saveHostAction(hostId: string) {
  return runServerFetch<unknown>(
    `${base()}/saved-hosts/${encodeURIComponent(hostId)}`,
    {
      method: "POST",
      headers: await serverAuthHeaders(),
    },
    "saveHostAction"
  );
}

export async function unsaveHostAction(hostId: string) {
  return runServerFetch<unknown>(
    `${base()}/saved-hosts/${encodeURIComponent(hostId)}`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(),
    },
    "unsaveHostAction"
  );
}

export async function getHostIdForChannelAction(channelId: string) {
  return runServerFetch<{ hostId: string | null }>(
    `${base()}/saved-hosts/by-channel/${encodeURIComponent(channelId)}/host-id`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "getHostIdForChannelAction",
    raw => {
      const o = raw as { hostId?: string };
      return { hostId: o.hostId ?? null };
    }
  );
}
