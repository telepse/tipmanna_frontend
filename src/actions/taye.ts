"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

const base = () => process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

export async function getTayeGateContextAction(eventId: string) {
  return runServerFetch<{
    tayeEnabled: boolean;
    tayeType?: string;
    discountPercent?: number;
    partnerSiteOrigin?: string | null;
  }>(
    `${base()}/taye/events/${encodeURIComponent(eventId)}/gate-context`,
    { method: "GET", cache: "no-store" },
    "getTayeGateContextAction"
  );
}

export async function getTayeHostDashboardAction() {
  return runServerFetch(
    `${base()}/taye/host/dashboard`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getTayeHostDashboardAction"
  );
}

export async function getTayeEnrollmentsAction(eventId: string) {
  return runServerFetch(
    `${base()}/taye/host/events/${encodeURIComponent(eventId)}/enrollments`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getTayeEnrollmentsAction"
  );
}

export async function applyTayePartnerAction(siteOrigin?: string) {
  return runServerFetch(
    `${base()}/taye/host/partner/apply`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ siteOrigin }),
    },
    "applyTayePartnerAction"
  );
}

export async function rotateTayePartnerApiKeyAction() {
  return runServerFetch(
    `${base()}/taye/host/partner/rotate-key`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
    },
    "rotateTayePartnerApiKeyAction"
  );
}

export async function reportTayePrerequisitesAction(
  body: Record<string, boolean>
) {
  return runServerFetch(
    `${base()}/taye/host/partner/prerequisites`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
    },
    "reportTayePrerequisitesAction"
  );
}

export async function setTayeEventActiveAction(
  eventId: string,
  tayeActive: boolean
) {
  return runServerFetch(
    `${base()}/taye/host/events/${encodeURIComponent(eventId)}/active`,
    {
      method: "PATCH",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ tayeActive }),
    },
    "setTayeEventActiveAction"
  );
}

export async function listTayeOutboundPartnersAction() {
  return runServerFetch<{
    partners: Array<{
      id: string;
      siteOrigin: string | null;
      hostDisplayName: string;
    }>;
  }>(
    `${base()}/taye/host/outbound-partners`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listTayeOutboundPartnersAction"
  );
}

export async function publishTayeOutboundAction(
  eventId: string,
  partnerId: string
) {
  return runServerFetch<{
    eventId: string;
    tayeEventId: string;
    partnerReturnedEventId: string;
    alreadyPublished: boolean;
  }>(
    `${base()}/taye/host/events/${encodeURIComponent(eventId)}/outbound-publish`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ partnerId }),
    },
    "publishTayeOutboundAction"
  );
}

export async function claimTayeCohostAction(inviteToken: string) {
  return runServerFetch(
    `${base()}/taye/host/claim-cohost`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ inviteToken: inviteToken.trim() }),
    },
    "claimTayeCohostAction"
  );
}
