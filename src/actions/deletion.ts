"use server";

import { runServerFetch } from "@/lib/action-fetch";
import {
  ACCOUNT_DELETION_V2_PATHS,
  assertNoLegacyOrPurgeUrl,
  isSafeOwnRequestId,
  type AccountDeletionRequestResult,
  type DeletionBlocker,
  type DeletionCapabilities,
} from "@/lib/account-deletion";
import {
  CONTENT_DELETION_V2_PATHS,
  isContentDeletionType,
  type ContentDeletionRequestResult,
  type ContentDeletionType,
} from "@/lib/content-deletion";
import { cookies } from "next/headers";

const apiBase = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

/** Tipper `token` or host `hostToken` only — never visitorToken. */
async function resolveAccountAuthToken(): Promise<string | null> {
  try {
    const store = await cookies();
    const tipper = store.get("token")?.value?.trim();
    if (tipper) return tipper;
    const host = store.get("hostToken")?.value?.trim();
    if (host) return host;
    return null;
  } catch {
    return null;
  }
}

/** Content deletion is host-only on the V2 API. */
async function resolveHostAuthToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get("hostToken")?.value?.trim() || null;
  } catch {
    return null;
  }
}

function deletionUrl(path: string): string {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  assertNoLegacyOrPurgeUrl(url);
  return url;
}

export async function getDeletionCapabilitiesAction() {
  const url = deletionUrl(ACCOUNT_DELETION_V2_PATHS.capabilities);
  return runServerFetch<DeletionCapabilities>(
    url,
    { method: "GET", cache: "no-store" },
    "getDeletionCapabilitiesAction"
  );
}

export async function getAccountDeletionPreflightAction() {
  const token = await resolveAccountAuthToken();
  if (!token) {
    return {
      data: null,
      error: "Unauthorized",
      success: false,
      message: "Sign in required",
      httpStatus: 401,
    };
  }
  const url = deletionUrl(ACCOUNT_DELETION_V2_PATHS.preflight);
  return runServerFetch<{ ok: boolean; blockers: DeletionBlocker[] }>(
    url,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
    "getAccountDeletionPreflightAction"
  );
}

export async function createAccountDeletionRequestAction(input: {
  agree: boolean;
  clientKey?: string;
}) {
  const token = await resolveAccountAuthToken();
  if (!token) {
    return {
      data: null as AccountDeletionRequestResult | null,
      error: "Unauthorized",
      success: false,
      message: "Sign in required",
      httpStatus: 401,
    };
  }
  if (!input.agree) {
    return {
      data: null,
      error: "Agreement required",
      success: false,
      message: "You must confirm before requesting account deletion",
      httpStatus: 400,
    };
  }
  const url = deletionUrl(ACCOUNT_DELETION_V2_PATHS.requests);
  return runServerFetch<AccountDeletionRequestResult>(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agree: true,
        ...(input.clientKey ? { clientKey: input.clientKey } : {}),
      }),
      cache: "no-store",
    },
    "createAccountDeletionRequestAction"
  );
}

export async function getOwnDeletionRequestAction(requestId: string) {
  if (!isSafeOwnRequestId(requestId)) {
    return {
      data: null,
      error: "Invalid request",
      success: false,
      message: "Invalid request id",
      httpStatus: 400,
    };
  }
  const token = await resolveAccountAuthToken();
  if (!token) {
    return {
      data: null,
      error: "Unauthorized",
      success: false,
      message: "Sign in required",
      httpStatus: 401,
    };
  }
  const url = deletionUrl(ACCOUNT_DELETION_V2_PATHS.requestById(requestId));
  return runServerFetch<{
    request?: { id?: string; status?: string; kind?: string };
    steps?: unknown[];
  }>(
    url,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
    "getOwnDeletionRequestAction"
  );
}

export async function cancelOwnDeletionRequestAction(requestId: string) {
  if (!isSafeOwnRequestId(requestId)) {
    return {
      data: null,
      error: "Invalid request",
      success: false,
      message: "Invalid request id",
      httpStatus: 400,
    };
  }
  const token = await resolveAccountAuthToken();
  if (!token) {
    return {
      data: null,
      error: "Unauthorized",
      success: false,
      message: "Sign in required",
      httpStatus: 401,
    };
  }
  const url = deletionUrl(ACCOUNT_DELETION_V2_PATHS.cancel(requestId));
  return runServerFetch<{ status?: string }>(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
    "cancelOwnDeletionRequestAction"
  );
}

export async function getContentDeletionPreflightAction(input: {
  type: string;
  id: string;
}) {
  if (!isContentDeletionType(input.type) || !isSafeOwnRequestId(input.id)) {
    return {
      data: null,
      error: "Invalid content",
      success: false,
      message: "Invalid content type or id",
      httpStatus: 400,
    };
  }
  const token = await resolveHostAuthToken();
  if (!token) {
    return {
      data: null,
      error: "Unauthorized",
      success: false,
      message: "Host sign-in required for content deletion",
      httpStatus: 401,
    };
  }
  const url = deletionUrl(
    CONTENT_DELETION_V2_PATHS.preflight(input.type, input.id)
  );
  return runServerFetch<{ ok: boolean; blockers: DeletionBlocker[] }>(
    url,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
    "getContentDeletionPreflightAction"
  );
}

export async function createContentDeletionRequestAction(input: {
  type: ContentDeletionType;
  id: string;
  agree: boolean;
  clientKey?: string;
}) {
  if (!isContentDeletionType(input.type) || !isSafeOwnRequestId(input.id)) {
    return {
      data: null as ContentDeletionRequestResult | null,
      error: "Invalid content",
      success: false,
      message: "Invalid content type or id",
      httpStatus: 400,
    };
  }
  const token = await resolveHostAuthToken();
  if (!token) {
    return {
      data: null as ContentDeletionRequestResult | null,
      error: "Unauthorized",
      success: false,
      message: "Host sign-in required for content deletion",
      httpStatus: 401,
    };
  }
  if (!input.agree) {
    return {
      data: null,
      error: "Agreement required",
      success: false,
      message: "You must confirm before requesting content deletion",
      httpStatus: 400,
    };
  }
  const url = deletionUrl(CONTENT_DELETION_V2_PATHS.requests);
  return runServerFetch<ContentDeletionRequestResult>(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: input.type,
        id: input.id,
        agree: true,
        ...(input.clientKey ? { clientKey: input.clientKey } : {}),
      }),
      cache: "no-store",
    },
    "createContentDeletionRequestAction"
  );
}