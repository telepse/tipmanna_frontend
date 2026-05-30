"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

function api() {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export async function getHostPayoutSummaryAction(token?: string | null) {
  return runServerFetch<{
    host: unknown[];
    communities: unknown[];
  }>(
    `${api()}/me/payouts/summary`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getHostPayoutSummaryAction"
  );
}

export async function acceptPayoutSettlementAction(
  token: string | null | undefined,
  settlementId: string
) {
  return runServerFetch<{ ok?: boolean }>(
    `${api()}/me/payouts/settlements/${settlementId}/accept`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "acceptPayoutSettlementAction"
  );
}
