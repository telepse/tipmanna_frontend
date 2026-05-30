/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostEventsForTabsByStatus } from "@/actions/events";
import type { RootState } from "@/redux/store";

export function useHostEventsForTabsByStatus() {
  const user = useSelector((s: RootState) => s.auth.user);

  const fetcher = async () => {
    const response = await getHostEventsForTabsByStatus();
    return response.data;
  };

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? "/host-events-for-tabs-by-status" : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    all: (data as any)?.all || [],
    ongoing: (data as any)?.ongoing || [],
    notStarted: (data as any)?.notStarted || [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
