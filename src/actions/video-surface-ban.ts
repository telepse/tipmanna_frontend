"use server";

import {
  actionFail,
  actionOk,
  runServerFetch,
  type ActionResult,
} from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

export type VideoBanSurface =
  | "tv"
  | "explore"
  | "discover"
  | "internal_search"
  | "external_search";

export type HostVideoSurfaceBanState = {
  bannedSurfaces: VideoBanSurface[];
  superadminLocked: boolean;
  reason: string | null;
};

function backendUrl(path: string): string {
  const b = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return `${b.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getHostVideoSurfaceBansAction(
  eventId: string,
  channelId: string
): Promise<ActionResult<HostVideoSurfaceBanState>> {
  return runServerFetch<HostVideoSurfaceBanState>(
    backendUrl(
      `/events/${encodeURIComponent(eventId)}/channels/${encodeURIComponent(channelId)}/surface-bans`
    ),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostVideoSurfaceBansAction"
  );
}

export async function setHostVideoSurfaceBansAction(
  eventId: string,
  channelId: string,
  bannedSurfaces: VideoBanSurface[],
  reason?: string
): Promise<ActionResult<HostVideoSurfaceBanState>> {
  try {
    const res = await fetch(
      backendUrl(
        `/events/${encodeURIComponent(eventId)}/channels/${encodeURIComponent(channelId)}/surface-bans`
      ),
      {
        method: "PUT",
        headers: {
          ...(await serverHostAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bannedSurfaces, reason }),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) detail = body.message;
      } catch {
        /* ignore */
      }
      return actionFail(detail, {
        logContext: "setHostVideoSurfaceBansAction",
        httpStatus: res.status,
      });
    }
    const data = (await res.json()) as HostVideoSurfaceBanState;
    return actionOk(data);
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to update surface bans",
      "setHostVideoSurfaceBansAction"
    );
  }
}
