"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

function api() {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export type LegacyCommunityPayoutRow = {
  id: string;
  communityId: string;
  communityName: string;
  amountOwed: string;
  amountPaid: string;
  outstanding: string;
  currency: string;
  status: string;
  settledAt: string | null;
  updatedAt: string;
};

export type HostPayoutSummaryBlock = {
  pendingMinor: number;
  receivedMinor: number;
  pendingByBranch: {
    eventTipsMinor: number;
    communitySubscriptionMinor: number;
  };
  receivedByBranch: {
    eventTipsMinor: number;
    communitySubscriptionMinor: number;
  };
  pendingAckCount: number;
};

export type HostPayoutSettlementRow = {
  id: string;
  label: string;
  amountMinor: number;
  receiptUrl?: string | null;
  branch: string;
};

export type HostPayoutObligationRow = {
  id: string;
  branch: string;
  amountOwedMinor: number;
  amountClearedMinor: number;
  outstandingMinor: number;
  status: string;
  communityName?: string;
  settlements?: Array<{
    id: string;
    status: string;
    amountMinor: number;
    receiptUrl?: string | null;
    createdAt: string;
  }>;
};

export type HostPayoutRequestStatus = {
  profileComplete: boolean;
  profileAccountType: "INDIVIDUAL" | "ORGANIZATION" | null;
  coOwnerOutstandingMinor: number;
  hasCoOwnerObligations: boolean;
  payoutsFrozen: boolean;
  canRequest: boolean;
};

export type HostPayoutSummaryResponse = {
  host: HostPayoutObligationRow[];
  communities: HostPayoutObligationRow[];
  summary: HostPayoutSummaryBlock;
  pendingSettlements: HostPayoutSettlementRow[];
  requestPayout: HostPayoutRequestStatus;
};

export async function getMyLegacyCommunityPayoutsAction(token?: string | null) {
  return runServerFetch<{ items: LegacyCommunityPayoutRow[]; total: number }>(
    `${api()}/me/payouts/community-legacy`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getMyLegacyCommunityPayoutsAction"
  );
}

export async function getHostPayoutSummaryAction(token?: string | null) {
  return runServerFetch<HostPayoutSummaryResponse>(
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

export async function requestHostPayoutAction(token?: string | null) {
  return runServerFetch<{
    ok?: boolean;
    message?: string;
    pendingMinor?: number;
  }>(
    `${api()}/me/payouts/request`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "requestHostPayoutAction"
  );
}
