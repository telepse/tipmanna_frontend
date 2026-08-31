"use client";

import useSWR from "swr";
import { getHostPayoutSummaryAction } from "@/actions/host-payouts";
import { useHostSession } from "@/hooks/use-host-session";

export function useHostPayoutSummary() {
  const { isActive: hostSessionActive, isLoading: hostSessionLoading } =
    useHostSession();

  const { data, error, isLoading, mutate } = useSWR(
    hostSessionActive && !hostSessionLoading ? "/me/payouts/summary" : null,
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
    connectPayouts: data?.connectPayouts ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
