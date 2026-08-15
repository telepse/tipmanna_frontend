"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

const base = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function getHostCoOwnedVideosAction() {
  return runServerFetch(
    `${base}/host/me/co-owned-videos`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "getHostCoOwnedVideosAction"
  );
}

export async function shareCoOwnerReportAction(
  eventChannelId: string,
  coOwnerEmail: string
) {
  return runServerFetch(
    `${base}/host/me/co-owned-videos/${encodeURIComponent(eventChannelId)}/share-report`,
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({ coOwnerEmail }),
      cache: "no-store",
    },
    "shareCoOwnerReportAction"
  );
}

export async function getCoOwnerPortalLinkAction(
  token?: string | null,
  email?: string | null
) {
  return runServerFetch(
    `${base}/private/co-owner/portal-link`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ email }),
      cache: "no-store",
    },
    "getCoOwnerPortalLinkAction"
  );
}
