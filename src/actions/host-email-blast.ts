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
  unlockedAt: string | null;
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
): Promise<ActionResult<{ request: HostEmailBlastRequest | null }>> {
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
