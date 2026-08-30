"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

const base = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function getHostCoOwnedVideosAction() {
  return runServerFetch(
    `${base}/host/me/co-owned-videos`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
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
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ coOwnerEmail }),
      cache: "no-store",
    },
    "shareCoOwnerReportAction"
  );
}

export async function getCoOwnerPortalLinkAction(email?: string | null) {
  return runServerFetch(
    `${base}/private/co-owner/portal-link`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ email }),
      cache: "no-store",
    },
    "getCoOwnerPortalLinkAction"
  );
}

export async function markCoOwnerPaidAction(
  eventChannelId: string,
  videoCoOwnerId: string,
  formData: FormData
) {
  const headers = await serverHostAuthHeaders();
  const auth = headers.Authorization;
  const res = await fetch(
    `${base}/host/me/co-owned-videos/${encodeURIComponent(eventChannelId)}/co-owners/${encodeURIComponent(videoCoOwnerId)}/mark-paid`,
    {
      method: "POST",
      headers: auth ? { Authorization: auth } : {},
      body: formData,
      cache: "no-store",
    }
  );
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && raw !== null && "message" in raw
        ? String((raw as { message?: string }).message)
        : `Request failed (${res.status})`;
    return { success: false as const, error: msg, data: null };
  }
  return { success: true as const, error: null, data: raw };
}
