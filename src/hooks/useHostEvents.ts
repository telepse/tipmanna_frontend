"use client";

import useSWR from "swr";

// Local imports
import { getHostEventsAction } from "@/actions/events";
import { getClientTokenFromPersist } from "@/lib/getClientToken";

export function useHostEvents() {
  const token = getClientTokenFromPersist();

  const fetcher = async () => {
    const response = await getHostEventsAction(token!);
    return response.data;
  };

  const {
    data: events,
    error,
    isLoading,
    mutate,
  } = useSWR("/host-events", fetcher, {
    revalidateOnFocus: false, // don’t refetch every time tab regains focus
  });

  return {
    events: events || [],
    isLoading,
    isError: !!error,
    refresh: mutate, // call this to re-fetch manually
  };
}
