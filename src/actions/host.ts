"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";
import { serverEventActorAuthHeaders } from "@/lib/server-event-auth";

// -------- Get top tippers -------- /
export async function getTopTippersAction(hostId: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/top-tippers`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
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
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getTopTipperDetailsAction"
  );
}

// -------- Get host event details -------- /
export async function getHostEventDetailsAction(
  hostId: string,
  eventId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
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
  timeZone?: string;

  cohosts?: UpdateEventCohostPayload[];

  performers?: UpdateEventPerformerPayload[];

  projects?: UpdateEventProjectPayload[];

  contents?: UpdateEventContentPayload[];
  thankYouMessage?: string | null;
}

export async function updateHostEventDetailsAction({
  hostId,
  eventId,
  payload,
}: {
  hostId: string;
  eventId: string;
  payload: UpdateHostEventDetailsPayload;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}`,
    {
      method: "PATCH",
      headers: await serverHostAuthHeaders(),
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
}: {
  hostId: string;
  eventId: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}`,
    {
      method: "DELETE",
      headers: await serverHostAuthHeaders(),
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
  payload,
}: {
  hostId: string;
  eventId: string;
  payload: SendHostEventReportPayload;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}/send-report`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
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
  payload,
}: {
  hostId: string;
  eventId: string;
  payload: PostHostEventMessagePayload;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await serverEventActorAuthHeaders()),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    "postHostEventMessageAction"
  );
}

export async function getHostEventMessagesAction(
  hostId: string,
  eventId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}/messages`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(await serverEventActorAuthHeaders()),
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
}: {
  hostId: string;
  eventId: string;
  messageId: string;
}) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events/${eventId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: {
        ...(await serverEventActorAuthHeaders()),
      },
      cache: "no-store",
    },
    "deleteHostEventMessageAction"
  );
}

// -------- Get host event summaries -------- /
export async function getHostEventSummaries(hostId: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/events`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostEventSummaries"
  );
}

// -------- Get host transactions -------- /
export async function getHostTransactionsAction(hostId: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/transactions`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostTransactionsAction"
  );
}

export async function getHostVideoAnalyticsAction(
  hostId: string,
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
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostVideoAnalyticsAction"
  );
}

/** Host video analytics sub-resources (overview, rollups, payments, etc.). */
export async function getHostVideoAnalyticsSubpathAction(
  hostId: string,
  subpath: string,
  params?: Record<string, string>
) {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${encodeURIComponent(hostId)}/video-analytics/${subpath}${qs}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostVideoAnalyticsSubpathAction"
  );
}

export async function getHostStatsAction(hostId: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/${hostId}/stats`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostStatsAction"
  );
}

export async function getHostSubscriptionMeAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/me`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostSubscriptionMeAction"
  );
}

export async function hostSubscriptionCheckoutAction(
  tier: "premium" | "community",
  options?: { upgradeAtPeriodEnd?: boolean }
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/checkout`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({
        tier,
        upgradeAtPeriodEnd: options?.upgradeAtPeriodEnd === true,
      }),
    },
    "hostSubscriptionCheckoutAction"
  );
}

export async function hostSubscriptionConfirmAction(sessionId: string) {
  const qs = new URLSearchParams({ session_id: sessionId });
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/confirm?${qs.toString()}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "hostSubscriptionConfirmAction"
  );
}

export async function hostSubscriptionBillingPortalAction() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/billing-portal`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
    },
    "hostSubscriptionBillingPortalAction"
  );
}

export async function hostSubscriptionRequestAction(
  tier: "HOST_PREMIUM" | "HOST_COMMUNITY",
  hostId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/request`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ tier, hostId }),
    },
    "hostSubscriptionRequestAction"
  );
}
