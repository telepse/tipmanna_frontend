"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders, serverHostAuthHeaders } from "@/lib/server-auth";

const base = () => process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

export type InAppNotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  payloadJson?: unknown | null;
  categoryKey?: string | null;
  deepLinkUrl?: string | null;
  readAt: string | null;
  createdAt: string;
};

export type FeedNotificationRow = InAppNotificationRow & {
  source?: string;
  landingUrl?: string | null;
  imageUrl?: string | null;
  scheduledAt?: string | null;
  postId?: string | null;
};

export async function listNotificationsFeedAction(opts?: {
  token?: string;
  deviceKey?: string;
  unreadOnly?: boolean;
  limit?: number;
  categoryKey?: string;
  cursor?: string;
}) {
  const qs = new URLSearchParams();
  if (opts?.deviceKey) qs.set("deviceKey", opts.deviceKey);
  if (opts?.unreadOnly) qs.set("unreadOnly", "true");
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  if (opts?.categoryKey) qs.set("categoryKey", opts.categoryKey);
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  const q = qs.toString();

  return runServerFetch<{
    notifications: FeedNotificationRow[];
    nextCursor?: string | null;
    meta?: { guestWelcomeShown?: boolean; requiresAuthFor?: string[] };
  }>(
    `${base()}/notifications/feed${q ? `?${q}` : ""}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(opts?.token),
      cache: "no-store",
    },
    "listNotificationsFeedAction"
  );
}

export async function listHostNotificationsMeAction(opts?: {
  unreadOnly?: boolean;
  limit?: number;
  communityId?: string;
}) {
  const qs = new URLSearchParams();
  if (opts?.unreadOnly) qs.set("unreadOnly", "true");
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  if (opts?.communityId?.trim()) {
    qs.set("communityId", opts.communityId.trim());
  }
  const q = qs.toString();
  return runServerFetch<{ notifications: InAppNotificationRow[] }>(
    `${base()}/notifications/me${q ? `?${q}` : ""}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listHostNotificationsMeAction"
  );
}

export async function listNotificationsMeAction(
  token?: string | null,
  opts?: { unreadOnly?: boolean; limit?: number }
) {
  const qs = new URLSearchParams();
  if (opts?.unreadOnly) qs.set("unreadOnly", "true");
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  const q = qs.toString();
  return runServerFetch<{ notifications: InAppNotificationRow[] }>(
    `${base()}/notifications/me${q ? `?${q}` : ""}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listNotificationsMeAction"
  );
}

export async function getHostNotificationsUnreadCountAction(opts?: {
  communityId?: string;
}) {
  const qs = new URLSearchParams();
  if (opts?.communityId?.trim()) {
    qs.set("communityId", opts.communityId.trim());
  }
  const q = qs.toString();
  return runServerFetch<{ count: number }>(
    `${base()}/notifications/me/unread-count${q ? `?${q}` : ""}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostNotificationsUnreadCountAction"
  );
}

export async function getNotificationsUnreadCountAction(
  token?: string | null,
  deviceKey?: string | null
) {
  const qs = deviceKey?.trim()
    ? `?deviceKey=${encodeURIComponent(deviceKey.trim())}`
    : "";
  return runServerFetch<{ count: number }>(
    `${base()}/notifications/feed/unread-count${qs}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getNotificationsUnreadCountAction"
  );
}

export async function markNotificationReadAction(
  id: string,
  token?: string | null
) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "markNotificationReadAction"
  );
}

export async function markAllNotificationsReadAction(token?: string | null) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/notifications/me/read-all`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "markAllNotificationsReadAction"
  );
}

export async function recordNotificationViewAction(
  id: string,
  token?: string | null
) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/notifications/${encodeURIComponent(id)}/view`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "recordNotificationViewAction"
  );
}

export async function recordNotificationClickAction(
  id: string,
  token?: string | null
) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/notifications/${encodeURIComponent(id)}/click`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "recordNotificationClickAction"
  );
}

export async function deleteNotificationAction(
  id: string,
  token?: string | null
) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/notifications/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "deleteNotificationAction"
  );
}

export async function markHostNotificationReadAction(id: string) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/notifications/${encodeURIComponent(id)}/read`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "markHostNotificationReadAction"
  );
}

export async function markAllHostNotificationsReadAction(opts?: {
  communityId?: string;
}) {
  const communityId = opts?.communityId?.trim();
  const qs = communityId
    ? `?communityId=${encodeURIComponent(communityId)}`
    : "";
  return runServerFetch<{ ok: boolean }>(
    `${base()}/notifications/me/read-all${qs}`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "markAllHostNotificationsReadAction"
  );
}

export async function deleteHostNotificationAction(id: string) {
  return runServerFetch<{ ok: boolean }>(
    `${base()}/notifications/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "deleteHostNotificationAction"
  );
}

export type NotificationPreferenceRow = {
  categoryKey: string;
  channel: string;
  enabled: boolean;
};

export async function getNotificationPreferencesAction() {
  return runServerFetch<{ preferences: NotificationPreferenceRow[] }>(
    `${base()}/notifications/preferences/me`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "getNotificationPreferencesAction"
  );
}

export async function updateNotificationPreferencesAction(
  preferences: NotificationPreferenceRow[]
) {
  return runServerFetch<{ ok?: boolean }>(
    `${base()}/notifications/preferences/me`,
    {
      method: "PUT",
      headers: await serverAuthHeaders(),
      body: JSON.stringify({ preferences }),
      cache: "no-store",
    },
    "updateNotificationPreferencesAction"
  );
}

export async function subscribePushAction(
  body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    userAgent?: string;
  },
  token?: string | null
) {
  return runServerFetch(
    `${base()}/notifications/push/subscribe`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "subscribePushAction"
  );
}

export async function listPushSubscriptionsAction(token?: string | null) {
  return runServerFetch<{ subscriptions: unknown[] }>(
    `${base()}/notifications/push/me`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listPushSubscriptionsAction"
  );
}
