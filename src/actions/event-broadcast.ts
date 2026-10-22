"use server";

import {
  actionFail,
  actionOk,
  hostSessionRequiredActionFail,
  runServerFetch,
  type ActionResult,
} from "@/lib/action-fetch";
import type {
  EventBroadcastPhase,
  EventBroadcastRow,
  NativeActivationResult,
  PublisherSessionResult,
} from "@/lib/event-broadcast-client";
import { HOST_AUTH_MISSING_HEADER } from "@/lib/server-auth";
import {
  serverEventActorAuthHeaders,
  type ServerEventActorAuthOptions,
} from "@/lib/server-event-auth";

export type EventBroadcastActionOptions = ServerEventActorAuthOptions;

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
  const headers = await serverEventActorAuthHeaders({
    eventId,
    preferHostSession: options?.preferHostSession,
  });
  if (HOST_AUTH_MISSING_HEADER in headers) {
    return hostSessionRequiredActionFail();
  }
  return headers;
}

export async function fetchCurrentEventBroadcastAction(
  eventId: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<import("@/lib/event-broadcast-client").EventBroadcastCurrentPayload>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");

  const headersOrFail = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(headersOrFail)) return headersOrFail;

  const url = `${base}/events/${eventId}/broadcasts/current`;
  const result = await runServerFetch<{
    broadcast: EventBroadcastRow | null;
    terminal?: import("@/lib/event-broadcast-client").EventBroadcastTerminal | null;
  }>(
    url,
    {
      method: "GET",
      headers: headersOrFail,
      cache: "no-store",
    },
    "fetchCurrentEventBroadcastAction"
  );
  if (!result.success) {
    if (result.httpStatus === 404) {
      return actionOk({ broadcast: null, terminal: null });
    }
    return {
      data: null,
      error: result.error,
      success: false,
      message: result.message,
      httpStatus: result.httpStatus,
      validationBody: result.validationBody,
    };
  }
  const payload = result.data as {
    broadcast?: EventBroadcastRow | null;
    terminal?: import("@/lib/event-broadcast-client").EventBroadcastTerminal | null;
  };
  const { resolveEventBroadcastCurrentRow } = await import(
    "@/lib/event-broadcast-current-row"
  );
  return actionOk({
    broadcast: resolveEventBroadcastCurrentRow(payload ?? {}),
    terminal: payload?.terminal ?? null,
  });
}

export async function createEventBroadcastIntentAction(
  eventId: string,
  input: { idempotencyKey: string; eventChannelId?: string },
  options?: EventBroadcastActionOptions
): Promise<ActionResult<{ broadcastId: string; created: boolean }>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");

  const headersOrFail = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(headersOrFail)) return headersOrFail;

  return runServerFetch(
    `${base}/events/${eventId}/broadcasts`,
    {
      method: "POST",
      headers: headersOrFail,
      body: JSON.stringify(input),
      cache: "no-store",
    },
    "createEventBroadcastIntentAction"
  );
}

export async function activateNativeStreamingWalletAction(
  eventId: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<NativeActivationResult>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");

  const headersOrFail = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(headersOrFail)) return headersOrFail;

  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/native-activation`,
    {
      method: "POST",
      headers: headersOrFail,
      body: JSON.stringify({}),
      cache: "no-store",
    },
    "activateNativeStreamingWalletAction"
  );
}

export async function issueEventBroadcastPublisherSessionAction(
  eventId: string,
  broadcastId: string,
  deviceSessionId: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<PublisherSessionResult>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");

  const headersOrFail = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(headersOrFail)) return headersOrFail;

  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/publisher-session`,
    {
      method: "POST",
      headers: headersOrFail,
      body: JSON.stringify({ deviceSessionId }),
      cache: "no-store",
    },
    "issueEventBroadcastPublisherSessionAction"
  );
}

export async function preflightEventBroadcastAction(
  eventId: string,
  broadcastId: string,
  operationKey: string,
  options?: EventBroadcastActionOptions
): Promise<ActionResult<Record<string, unknown>>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");

  const headersOrFail = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(headersOrFail)) return headersOrFail;

  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/preflight`,
    {
      method: "POST",
      headers: headersOrFail,
      body: JSON.stringify({ operationKey }),
      cache: "no-store",
    },
    "preflightEventBroadcastAction"
  );
}

export async function startEventBroadcastAction(
  eventId: string,
  broadcastId: string,
  idempotencyKey: string,
  options?: EventBroadcastActionOptions
): Promise<
  ActionResult<{
    operationId: string;
    accepted: boolean;
    phase: EventBroadcastPhase;
  }>
> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");

  const headersOrFail = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(headersOrFail)) return headersOrFail;

  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/start`,
    {
      method: "POST",
      headers: headersOrFail,
      body: JSON.stringify({ idempotencyKey }),
      cache: "no-store",
    },
    "startEventBroadcastAction"
  );
}

export async function stopEventBroadcastAction(
  eventId: string,
  broadcastId: string,
  input: { idempotencyKey: string; reason: string },
  options?: EventBroadcastActionOptions
): Promise<ActionResult<Record<string, unknown>>> {
  const base = apiBase();
  if (!base) return actionFail("Backend API URL is not configured");

  const headersOrFail = await broadcastHeaders(eventId, options);
  if (isAuthActionFail(headersOrFail)) return headersOrFail;

  return runServerFetch(
    `${base}/events/${eventId}/broadcasts/${broadcastId}/stop`,
    {
      method: "POST",
      headers: headersOrFail,
      body: JSON.stringify(input),
      cache: "no-store",
    },
    "stopEventBroadcastAction"
  );
}
