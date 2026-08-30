"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";
import type { TipConfigPayload } from "@/lib/tip-config-types";

const base = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export type HostTipConfigResponse = {
  initialized: boolean;
  frozen?: boolean;
  active?: {
    version: number;
    etag: string;
    reviewNeeded: boolean;
    config: TipConfigPayload;
    publishedAt?: string;
  } | null;
  draft?: TipConfigPayload | null;
};

export type AnimationLibraryItem = {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
  library: string;
  styleName: string | null;
  type: string;
};

export async function loadHostTipConfigAction(eventId: string) {
  return runServerFetch<HostTipConfigResponse>(
    `${base()}/host/tip-config/${encodeURIComponent(eventId)}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "loadHostTipConfigAction"
  );
}

export async function initHostTipConfigAction(eventId: string) {
  return runServerFetch<{ ok?: boolean; tipConfigId?: string }>(
    `${base()}/host/tip-config/${encodeURIComponent(eventId)}/init`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "initHostTipConfigAction"
  );
}

export async function saveHostTipConfigDraftAction(
  eventId: string,
  payload: TipConfigPayload
) {
  return runServerFetch<{ ok?: boolean; etag?: string }>(
    `${base()}/host/tip-config/${encodeURIComponent(eventId)}/draft`,
    {
      method: "PUT",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    "saveHostTipConfigDraftAction"
  );
}

export async function publishHostTipConfigAction(eventId: string) {
  return runServerFetch<{
    ok?: boolean;
    version?: number;
    etag?: string;
    reviewNeeded?: boolean;
  }>(
    `${base()}/host/tip-config/${encodeURIComponent(eventId)}/publish`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "publishHostTipConfigAction"
  );
}

export async function resetHostTipConfigAction(eventId: string) {
  return runServerFetch<{ ok?: boolean; config?: TipConfigPayload }>(
    `${base()}/host/tip-config/${encodeURIComponent(eventId)}/reset-default`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "resetHostTipConfigAction"
  );
}

export async function getHostAnimationLibraryAction(opts?: {
  library?: string;
  q?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.library) params.set("library", opts.library);
  if (opts?.q) params.set("q", opts.q);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  const q = params.toString();
  return runServerFetch<{ items: AnimationLibraryItem[] }>(
    `${base()}/host/animation-library${q ? `?${q}` : ""}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostAnimationLibraryAction"
  );
}

export async function submitPremiumAnimationRequestAction(body: {
  eventId: string;
  description: string;
  inspirationUrls?: string[];
}) {
  return runServerFetch(
    `${base()}/host/premium-animation-requests`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "submitPremiumAnimationRequestAction"
  );
}
