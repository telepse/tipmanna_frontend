"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostStatsAction } from "@/actions/host";
import type { RootState } from "@/redux/store";

export type HostStatsSummary = {
  totalEventsCreated: number;
  totalAttendeesReached: number;
  totalTipsEarned: number;
  averageTipPerEvent: number;
  totalTips: number;
};

export function useHostStats() {
  const user = useSelector((state: RootState) => state.auth.user);

  const fetcher = async (): Promise<HostStatsSummary | null> => {
    if (!user?.id) return null;

    const response = await getHostStatsAction(user.id);
    if (!response.success || !response.data) {
      throw new Error(response.message ?? "Failed to load host statistics");
    }

    return response.data as HostStatsSummary;
  };

  const { data, error, isLoading, mutate } = useSWR<HostStatsSummary | null>(
    user?.id ? `/host-stats/${user.id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    stats: data ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
