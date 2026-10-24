"use server";

import {
  actionFail,
  actionOk,
  hostSessionRequiredActionFail,
  runServerFetch,
  type ActionResult,
} from "@/lib/action-fetch";
import { HOST_AUTH_MISSING_HEADER } from "@/lib/server-auth";
import {
  serverEventActorAuthHeaders,
  type ServerEventActorAuthOptions,
} from "@/lib/server-event-auth";
import type { EventBroadcastActionOptions } from "@/actions/event-broadcast";

function apiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";
  return base.replace(/\/$/, "");
}

async function headers(
  eventId: string,
  options?: EventBroadcastActionOptions
): Promise<Record<string, string> | ActionResult<never>> {
  const h = await serverEventActorAuthHeaders({
    eventId,
    preferHostSession: options?.preferHostSession,
  });
  if (HOST_AUTH_MISSING_HEADER in h) {
    return hostSessionRequiredActionFail();
  }
  return h;
}

export async function prepareAdvancedStudioAction(
  eventId: string,
  broadcastId: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<{ advancedPrepStatus: string; consumptionRate: string }>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await headers(eventId, options);
  if ("success" in h) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/prepare`,
    { method: "POST", headers: { ...h, "Content-Type": "application/json" } },
    "prepareAdvancedStudioAction"
  );
}

export async function acquireDirectorLeaseAction(
  eventId: string,
  broadcastId: string,
  deviceSessionId: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<{ expiresAt: string; deviceSessionId: string }>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await headers(eventId, options);
  if ("success" in h) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/director-lease`,
    {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acquire", deviceSessionId }),
    },
    "acquireDirectorLeaseAction"
  );
}

export async function createContributorInviteAction(
  eventId: string,
  broadcastId: string,
  options?: EventBroadcastActionOptions
): Promise<
  ActionResult<{
    inviteToken: string;
    expiresAt: string;
    joinMode: string;
  }>
> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await headers(eventId, options);
  if ("success" in h) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/contributor-invites`,
    { method: "POST", headers: { ...h, "Content-Type": "application/json" } },
    "createContributorInviteAction"
  );
}

export async function redeemContributorInviteAction(
  eventId: string,
  broadcastId: string,
  input: { inviteToken: string; deviceSessionId: string },
  options?: EventBroadcastActionOptions
): Promise<ActionResult<{ contributorSessionId: string; expiresAt: string }>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await headers(eventId, options);
  if ("success" in h) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/contributor-invites/redeem`,
    {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "redeemContributorInviteAction"
  );
}

export async function activateAdvancedStudioAction(
  eventId: string,
  broadcastId: string,
  input: { deviceSessionId: string; idempotencyKey: string },
  options?: EventBroadcastActionOptions
): Promise<
  ActionResult<{
    consumptionRate: string;
    advancedPrepStatus: string;
    advancedActivatedAt: string;
  }>
> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await headers(eventId, options);
  if ("success" in h) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/activate`,
    {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "activateAdvancedStudioAction"
  );
}

export async function downgradeAdvancedStudioAction(
  eventId: string,
  broadcastId: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<{ consumptionRate: string; advancedPrepStatus: string }>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await headers(eventId, options);
  if ("success" in h) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/downgrade`,
    {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "owner_request" }),
    },
    "downgradeAdvancedStudioAction"
  );
}
