"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostPayoutSummaryAction } from "@/actions/host-payouts";
import type { RootState } from "@/redux/store";

export function useHostPayoutSummary() {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const isHost = useSelector(
    (s: RootState) =>
      s.auth.user && "role" in s.auth.user && s.auth.user.role === "HOST"
  );

  const { data, error, isLoading, mutate } = useSWR(
    isHost && authToken ? "/me/payouts/summary" : null,
    async () => {
      const res = await getHostPayoutSummaryAction(authToken);
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
