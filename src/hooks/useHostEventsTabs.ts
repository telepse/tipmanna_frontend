"use client";

import useSWR from "swr";

// Local imports
import { getHostEventsTabsAction } from "@/actions/events";
import { getClientTokenFromPersist } from "@/lib/getClientToken";

export function useHostEventsTabs() {
  const token = getClientTokenFromPersist();

  const fetcher = async () => {
    const response = await getHostEventsTabsAction(token!);
    return response.data;
  };

  const { data, error, isLoading, mutate } = useSWR(
    "/host-events-tabs",
    fetcher,
    {
      revalidateOnFocus: false, // don’t refetch every time tab regains focus
    }
  );

  return {
    all: data?.all || [],
    approved: data?.approved || [],
    pending: data?.pending || [],
    isLoading,
    isError: !!error,
    refresh: mutate, // call this to re-fetch manually
  };
}
