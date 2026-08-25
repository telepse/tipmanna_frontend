"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

function api(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(
    /\/$/,
    ""
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getCommunityAnalyticsSummaryAction(communityId: string) {
  return runServerFetch(
    api(`/communities/${encodeURIComponent(communityId)}/analytics/summary`),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getCommunityAnalyticsSummaryAction"
  );
}

export async function getCommunityAnalyticsVideoRollupsAction(
  communityId: string
) {
  return runServerFetch(
    api(
      `/communities/${encodeURIComponent(communityId)}/analytics/video-rollups`
    ),
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getCommunityAnalyticsVideoRollupsAction"
  );
}

export async function patchCommunityRoomScreenSettingsAction(
  communityId: string,
  body: {
    background?: string;
    moneyFor?: string;
    showLatest?: boolean;
    hideProgressAmount?: boolean;
  }
) {
  return runServerFetch(
    api(`/communities/${encodeURIComponent(communityId)}/screen-settings`),
    {
      method: "PATCH",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "patchCommunityRoomScreenSettingsAction"
  );
}

export async function getEventSessionsAction(eventId: string) {
  return runServerFetch(
    api(`/event-sessions/${encodeURIComponent(eventId)}/sessions`),
    {
      method: "GET",
      cache: "no-store",
    },
    "getEventSessionsAction"
  );
}
