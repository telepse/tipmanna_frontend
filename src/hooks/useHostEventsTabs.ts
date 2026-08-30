/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostEventsTabsAction } from "@/actions/events";
import type { RootState } from "@/redux/store";

export function useHostEventsTabs() {
  const user = useSelector((s: RootState) => s.auth.user);

  const fetcher = async () => {
    const response = await getHostEventsTabsAction();
    return response.data;
  };

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? "/host-events-tabs" : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    all: (data as any)?.all || [],
    approved: (data as any)?.approved || [],
    pending: (data as any)?.pending || [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
