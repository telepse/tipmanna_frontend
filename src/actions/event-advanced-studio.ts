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

type BroadcastAuthHeaders = Record<string, string>;

function isAuthActionFail(
  value: BroadcastAuthHeaders | ActionResult<never>
): value is ActionResult<never> {
  return "success" in value;
}

async function broadcastHeaders(
  eventId: string,
  options?: EventBroadcastActionOptions
): Promise<BroadcastAuthHeaders | ActionResult<never>> {
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
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
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
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
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
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
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
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
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
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
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

export async function patchAdvancedProgrammeAction(
  eventId: string,
  broadcastId: string,
  input: {
    expectedVersion: number;
    layout?: "camera_a" | "camera_b" | "split";
    mainAudioSource?: string;
  },
  options?: EventBroadcastActionOptions
): Promise<ActionResult<unknown>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/programme`,
    {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "patchAdvancedProgrammeAction"
  );
}

export type AssistedPresetId =
  | "stable_source_failover"
  | "louder_audio"
  | "activity_priority";

export async function fetchAssistedPresetsAction(
  eventId: string,
  broadcastId: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<{ presets: unknown[] }>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/assisted-presets`,
    { method: "GET", headers: h },
    "fetchAssistedPresetsAction"
  );
}

export async function patchAssistedPresetAction(
  eventId: string,
  broadcastId: string,
  input: {
    presetId: AssistedPresetId;
    enabled?: boolean;
    manualOverride?: boolean;
  },
  options?: EventBroadcastActionOptions
): Promise<ActionResult<{ presets: unknown[] }>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/assisted-presets`,
    {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "patchAssistedPresetAction"
  );
}

export async function applyAssistedPresetAction(
  eventId: string,
  broadcastId: string,
  presetId: AssistedPresetId,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<unknown>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/assisted-presets/apply`,
    {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ presetId }),
    },
    "applyAssistedPresetAction"
  );
}

export async function fetchHostBrandingRotationAction(
  eventId: string,
  broadcastId: string,
  options?: EventBroadcastActionOptions
): Promise<
  ActionResult<{
    slots: Array<{ id: string; label: string; durationSeconds: number }>;
    activeOverlay: {
      slotId: string;
      label: string;
      cycleIndex: number;
      secondsIntoSlot: number;
    } | null;
  }>
> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/branding`,
    { method: "GET", headers: h },
    "fetchHostBrandingRotationAction"
  );
}

export async function fetchInteractionAlertsAction(
  eventId: string,
  broadcastId: string,
  options?: EventBroadcastActionOptions
): Promise<
  ActionResult<{
    alerts: Array<{
      id: string;
      kind: string;
      payload: Record<string, unknown>;
      occurredAt: string;
    }>;
  }>
> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/advanced/interaction-alerts`,
    { method: "GET", headers: h },
    "fetchInteractionAlertsAction"
  );
}

export async function downgradeAdvancedStudioAction(
  eventId: string,
  broadcastId: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<{ consumptionRate: string; advancedPrepStatus: string }>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");
  const h = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(h)) return h;
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
