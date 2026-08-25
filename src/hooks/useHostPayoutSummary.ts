"use client";

import useSWR from "swr";
import { hasActiveHostSession } from "@/lib/host-session-client";
import { getHostPayoutSummaryAction } from "@/actions/host-payouts";

export function useHostPayoutSummary() {
  const hostSessionActive = hasActiveHostSession();

  const { data, error, isLoading, mutate } = useSWR(
    hostSessionActive ? "/me/payouts/summary" : null,
    async () => {
      const res = await getHostPayoutSummaryAction();
      if (!res.success || !res.data) return null;
      return res.data;
    },
    { revalidateOnFocus: true }
  );

  return {
    summary: data?.summary ?? null,
    pendingSettlements: data?.pendingSettlements ?? [],
    host: data?.host ?? [],
    communities: data?.communities ?? [],
    requestPayout: data?.requestPayout ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
