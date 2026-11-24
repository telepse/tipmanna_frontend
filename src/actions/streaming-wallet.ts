"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

export type HostStreamingWalletSummary = {
  ownerHostId: string;
  unitsPerCredit: number;
  totals: {
    availableUnits: number;
    grantedUnits: number;
    consumedUnits: number;
    availableCredits: number;
    grantedCredits: number;
    consumedCredits: number;
  };
  bySource: Record<
    string,
    { availableUnits: number; grantedUnits: number; consumedUnits: number }
  >;
  grants: Array<{
    id: string;
    cycleKind: string;
    cycleKey: string;
    grantedUnits: number;
    availableUnits: number;
    consumedUnits: number;
    coverageStart: string;
    coverageEnd: string;
    expired: boolean;
    sourceLabel: string;
  }>;
  packOrders: Array<{
    packOrderId: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
  recentLedger: Array<{
    id: string;
    entryKind: string;
    units: number;
    createdAt: string;
    grantId: string | null;
    reservationId: string | null;
  }>;
  affordance: {
    summary: string;
    standardRate: string;
    advancedRate: string;
    note: string;
  };
};

export async function streamingHostWalletAction(input: { hostId: string }) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) {
    return {
      success: false as const,
      error: "Backend API URL is not configured",
    };
  }

  const hostId = encodeURIComponent(input.hostId.trim());
  return runServerFetch<HostStreamingWalletSummary>(
    `${base}/hosts/${hostId}/streaming/wallet`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "streamingHostWalletAction"
  );
}
