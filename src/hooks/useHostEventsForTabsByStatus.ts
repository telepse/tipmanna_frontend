"use client";

import useSWR from "swr";

// Local imports
import { getHostEventsForTabsByStatus } from "@/actions/events";
import { getClientTokenFromPersist } from "@/lib/getClientToken";

export function useHostEventsForTabsByStatus() {
  const token = getClientTokenFromPersist();

  const fetcher = async () => {
    const response = await getHostEventsForTabsByStatus(token!);
    return response.data;
  };

  const { data, error, isLoading, mutate } = useSWR(
    "/host-events-for-tabs-by-status",
    fetcher,
    {
      revalidateOnFocus: false, // don’t refetch every time tab regains focus
    }
  );

  return {
    ongoing: data?.ongoing || [],
    notStarted: data?.notStarted || [],
    isLoading,
    isError: !!error,
    refresh: mutate, // call this to re-fetch manually
  };
}
