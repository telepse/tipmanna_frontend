"use server";

import { runServerFetch, type ActionResult } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

const base = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export type HostEmailBlastRequest = {
  id: string;
  status: string;
  recipientCount: number | null;
  quotedAmountGbp: string | null;
  hostMessage: string | null;
  saMessage: string | null;
  emailTitle: string | null;
  emailBody: string | null;
  declineReason: string | null;
  unlockedAt: string | null;
  sentAt: string | null;
};

export async function requestCommunityEmailBlastAction(
  communityId: string,
  hostMessage?: string
): Promise<
  ActionResult<{ request: HostEmailBlastRequest; alreadyOpen?: boolean }>
> {
  return runServerFetch(
    `${base()}/communities/${communityId}/email-blast/request`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await serverHostAuthHeaders()),
      },
      body: JSON.stringify({ hostMessage: hostMessage?.trim() || undefined }),
    },
    "requestCommunityEmailBlastAction"
  );
}

export async function getCommunityEmailBlastStatusAction(
  communityId: string
): Promise<
  ActionResult<{
    request: HostEmailBlastRequest | null;
    hasSentBlast?: boolean;
  }>
> {
  return runServerFetch(
    `${base()}/communities/${communityId}/email-blast/status`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(await serverHostAuthHeaders()),
      },
      cache: "no-store",
    },
    "getCommunityEmailBlastStatusAction"
  );
}

export async function submitCommunityEmailBlastPaymentAction(
  communityId: string,
  formData: FormData
): Promise<ActionResult<{ request: HostEmailBlastRequest }>> {
  const headers = await serverHostAuthHeaders();
  const auth = headers.Authorization;
  const res = await fetch(
    `${base()}/communities/${encodeURIComponent(communityId)}/email-blast/paid`,
    {
      method: "POST",
      headers: auth ? { Authorization: auth } : {},
      body: formData,
      cache: "no-store",
    }
  );
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && raw !== null && "message" in raw
        ? String((raw as { message?: string }).message)
        : `Request failed (${res.status})`;
    return {
      success: false,
      error: msg,
      data: null,
      httpStatus: res.status,
      validationBody: raw,
    };
  }
  return {
    success: true,
    error: null,
    data: raw as { request: HostEmailBlastRequest },
  };
}

export async function submitCommunityEmailBlastCopyAction(
  communityId: string,
  emailTitle: string,
  emailBody: string
): Promise<ActionResult<{ request: HostEmailBlastRequest }>> {
  return runServerFetch(
    `${base()}/communities/${encodeURIComponent(communityId)}/email-blast/compose`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await serverHostAuthHeaders()),
      },
      body: JSON.stringify({
        emailTitle: emailTitle.trim(),
        emailBody: emailBody.trim(),
      }),
    },
    "submitCommunityEmailBlastCopyAction"
  );
}
