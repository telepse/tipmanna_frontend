/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";

// Local imports
import { getHostEventsAction } from "@/actions/events";
import { getClientTokenFromPersist } from "@/lib/getClientToken";
import { getTopTippersAction } from "@/actions/host";
import { useHostID } from "./useHostID";

interface TopTippersData {
  tippers: any[]; // replace 'any' with your Tipper type if you have it
  events: any[]; // replace 'any' with your Event type
}

export function useTopTippers() {
  const token = getClientTokenFromPersist();
  const hostId = useHostID();

  const fetcher = async (): Promise<TopTippersData> => {
    if (!hostId || !token) return { tippers: [], events: [] };

    const [tippersRes, eventsRes] = await Promise.all([
      getTopTippersAction(hostId),
      getHostEventsAction(token),
    ]);

    return {
      tippers: tippersRes.data || [],
      events: eventsRes.data || [],
    };
  };

  const { data, error, isLoading, mutate } = useSWR("/top-tippers", fetcher, {
    revalidateOnFocus: false, // don’t refetch every time tab regains focus
  });

  return {
    tippers: data?.tippers || [],
    events: data?.events || [],
    isLoading,
    isError: !!error,
    refresh: mutate, // call this to re-fetch manually
  };
}
