"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

const base = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function getSelfCoOwnerPayoutsAction() {
  return runServerFetch<{ items: unknown[] }>(
    `${base}/private/co-owner/payouts`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getSelfCoOwnerPayoutsAction"
  );
}

export async function postSelfCoOwnerDisputeAction(body: {
  payoutId?: string;
  videoCoOwnerId?: string;
  kind?: "payout_false" | "unpaid_outstanding";
  reason: string;
}) {
  return runServerFetch(
    `${base}/private/co-owner/payouts/dispute`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "postSelfCoOwnerDisputeAction"
  );
}
