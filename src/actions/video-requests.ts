"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

function backendUrl(path: string): string {
  const b = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return `${b.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function listMyVideosForVideoRequestsAction() {
  return runServerFetch<{ events: unknown[] }>(
    backendUrl("/video-requests/me/videos-by-event"),
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "listMyVideosForVideoRequestsAction"
  );
}

export async function checkVideoRequestEligibilityAction(qs: URLSearchParams) {
  return runServerFetch<unknown>(
    `${backendUrl("/video-requests/check")}?${qs.toString()}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "checkVideoRequestEligibilityAction"
  );
}

export async function createVideoRequestAction(body: Record<string, unknown>) {
  return runServerFetch<unknown>(
    backendUrl("/video-requests"),
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "createVideoRequestAction"
  );
}

export async function listSentVideoRequestsAction(status?: string) {
  const q = status?.trim()
    ? `?${new URLSearchParams({ status }).toString()}`
    : "";
  return runServerFetch<{ requests: unknown[] }>(
    `${backendUrl("/video-requests/me/sent")}${q}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "listSentVideoRequestsAction"
  );
}

export async function listInboxVideoRequestsAction() {
  return runServerFetch<{ requests: unknown[] }>(
    backendUrl("/video-requests/me/inbox"),
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "listInboxVideoRequestsAction"
  );
}

export async function approveInboxVideoRequestAction(
  requestId: string,
  body: { approvalDurationHours?: number }
) {
  return runServerFetch<unknown>(
    backendUrl(
      `/video-requests/${encodeURIComponent(requestId)}/approve-feature`
    ),
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "approveInboxVideoRequestAction"
  );
}

export async function rejectInboxVideoRequestAction(
  requestId: string,
  notes?: string
) {
  return runServerFetch<unknown>(
    backendUrl(
      `/video-requests/${encodeURIComponent(requestId)}/reject-feature`
    ),
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({ notes }),
      cache: "no-store",
    },
    "rejectInboxVideoRequestAction"
  );
}

export async function cancelSentVideoRequestAction(requestId: string) {
  return runServerFetch<unknown>(
    backendUrl(`/video-requests/${encodeURIComponent(requestId)}/cancel`),
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "cancelSentVideoRequestAction"
  );
}

export async function getVideoRequestPrefsAction() {
  return runServerFetch<{
    preferences: unknown;
    whitelist: unknown[];
  }>(
    backendUrl("/video-requests/me/preferences"),
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "getVideoRequestPrefsAction"
  );
}

export async function patchVideoRequestPrefsAction(featureAcceptMode: string) {
  return runServerFetch<unknown>(
    backendUrl("/video-requests/me/preferences"),
    {
      method: "PATCH",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({ featureAcceptMode }),
      cache: "no-store",
    },
    "patchVideoRequestPrefsAction"
  );
}

export async function addWhitelistHostAction(allowedRequesterHostId: string) {
  return runServerFetch<unknown>(
    backendUrl("/video-requests/me/whitelist"),
    {
      method: "POST",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({ allowedRequesterHostId }),
      cache: "no-store",
    },
    "addWhitelistHostAction"
  );
}

export async function deleteWhitelistEntryAction(entryId: string) {
  return runServerFetch<unknown>(
    backendUrl(`/video-requests/me/whitelist/${encodeURIComponent(entryId)}`),
    {
      method: "DELETE",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "deleteWhitelistEntryAction"
  );
}
