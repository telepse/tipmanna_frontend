"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

// -------- Get top tippers -------- /
export async function getTopTippersAction(
  hostId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/top-tippers`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getTopTippersAction"
  );
}

// -------- Get top tipper details -------- /
export async function getTopTipperDetailsAction(
  hostId: string,
  tipperId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/top-tippers/${tipperId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getTopTipperDetailsAction"
  );
}

// -------- Get host event details -------- /
export async function getHostEventDetailsAction(
  hostId: string,
  eventId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? await serverAuthHeaders(token) : {}),
      },
      cache: "no-store",
    },
    "getHostEventDetailsAction"
  );
}

export interface UpdateEventCohostPayload {
  id: string;
  email: string;
}

export interface UpdateEventPerformerPayload {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface UpdateEventProjectPayload {
  id: string;
  name: string;
}

export interface UpdateEventContentPayload {
  id: string;
  title: string;
  description?: string;
}

export interface UpdateHostEventDetailsPayload {
  eventName?: string;
  eventDescription?: string;
  eventType?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;

  cohosts?: UpdateEventCohostPayload[];

  performers?: UpdateEventPerformerPayload[];

  projects?: UpdateEventProjectPayload[];

  contents?: UpdateEventContentPayload[];
}

export async function updateHostEventDetailsAction({
  hostId,
  eventId,
  payload,
  token,
}: {
  hostId: string;
  eventId: string;
  payload: UpdateHostEventDetailsPayload;
  token?: string | null;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? await serverAuthHeaders(token) : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    "updateHostEventDetailsAction"
  );
}

// -------- Delete host event details -------- /
export async function deleteHostEventDetailsAction({
  hostId,
  eventId,
  token,
}: {
  hostId: string;
  eventId: string;
  token?: string | null;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        ...(token ? await serverAuthHeaders(token) : {}),
      },
      cache: "no-store",
    },
    "deleteHostEventDetailsAction"
  );
}

export interface EventReportRecipientPayload {
  id: string;
  email: string;
  enabled: boolean;
}

export interface SendHostEventReportPayload {
  sendToHost?: boolean;
  cohosts: EventReportRecipientPayload[];
  performers: EventReportRecipientPayload[];
}

export async function sendHostEventReportAction({
  hostId,
  eventId,
  token,
  payload,
}: {
  hostId: string;
  eventId: string;
  token?: string | null;
  payload: SendHostEventReportPayload;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}/send-report`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? await serverAuthHeaders(token) : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    "sendHostEventReportAction"
  );
}

// -------- Post host event message -------- /

export interface PostHostEventMessagePayload {
  text: string;
}

export async function postHostEventMessageAction({
  hostId,
  eventId,
  token,
  payload,
}: {
  hostId: string;
  eventId: string;
  token?: string | null;
  payload: PostHostEventMessagePayload;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? await serverAuthHeaders(token) : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    "postHostEventMessageAction"
  );
}

export async function getHostEventMessagesAction(
  hostId: string,
  eventId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}/messages`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? await serverAuthHeaders(token) : {}),
      },
      cache: "no-store",
    },
    "getHostEventMessagesAction"
  );
}

export async function deleteHostEventMessageAction({
  hostId,
  eventId,
  messageId,
  token,
}: {
  hostId: string;
  eventId: string;
  messageId: string;
  token?: string | null;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: {
        ...(token ? await serverAuthHeaders(token) : {}),
      },
      cache: "no-store",
    },
    "deleteHostEventMessageAction"
  );
}

// -------- Get host event summaries -------- /
export async function getHostEventSummaries(
  hostId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? await serverAuthHeaders(token) : {}),
      },
      cache: "no-store",
    },
    "getHostEventSummaries"
  );
}

// -------- Get host transactions -------- /
export async function getHostTransactionsAction(
  hostId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/transactions`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostTransactionsAction"
  );
}

export async function getHostVideoAnalyticsAction(
  hostId: string,
  token?: string | null,
  opts?: { from?: string; to?: string; eventId?: string }
) {
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  if (opts?.eventId) params.set("eventId", opts.eventId);
  const q = params.toString();
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/video-analytics${q ? `?${q}` : ""}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostVideoAnalyticsAction"
  );
}

export async function getHostStatsAction(
  hostId: string,
  token?: string | null
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/stats`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostStatsAction"
  );
}
