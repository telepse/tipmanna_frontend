"use client";

import useSWR from "swr";
import { getHostPayoutSummaryAction } from "@/actions/host-payouts";
import { useHostSession } from "@/hooks/use-host-session";
import {
  isHostPayoutSummaryPending,
  resolveHostPayoutSummaryUiState,
  type HostPayoutSummaryUiState,
} from "@/lib/host-payout-summary-ui-state";

export function useHostPayoutSummary() {
  const { isActive: hostSessionActive, isLoading: hostSessionLoading } =
    useHostSession();

  const swrKey =
    hostSessionActive && !hostSessionLoading ? "/me/payouts/summary" : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const res = await getHostPayoutSummaryAction();
      if (!res.success || !res.data) {
        throw new Error(res.message ?? "Could not load payout summary");
      }
      return res.data;
    },
    { revalidateOnFocus: true }
  );

  const isError = !!error;
  const hasData = data !== undefined;

  const payoutUiState: HostPayoutSummaryUiState =
    resolveHostPayoutSummaryUiState({
      hostSessionLoading,
      hostSessionActive,
      swrLoading: isLoading,
      hasData,
      isError,
    });

  const isPending = isHostPayoutSummaryPending(payoutUiState);

  return {
    creatorPayoutVerifiedAt: data?.creatorPayoutVerifiedAt ?? null,
    summary: data?.summary ?? null,
    pendingSettlements: data?.pendingSettlements ?? [],
    host: data?.host ?? [],
    communities: data?.communities ?? [],
    requestPayout: data?.requestPayout ?? null,
    connectPayouts: data?.connectPayouts ?? null,
    isLoading,
    isError,
    isPending,
    payoutUiState,
    refresh: mutate,
  };
}
