/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostEventsAction } from "@/actions/events";
import { getTopTippersAction } from "@/actions/host";
import { useHostID } from "./useHostID";
import type { RootState } from "@/redux/store";

interface TopTippersData {
  tippers: any[];
  events: any[];
}

export function useTopTippers() {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostId = useHostID();

  const fetcher = async (): Promise<TopTippersData> => {
    if (!hostId || !user?.id) return { tippers: [], events: [] };

    const [tippersRes, eventsRes] = await Promise.all([
      getTopTippersAction(hostId),
      getHostEventsAction(),
    ]);

    return {
      tippers: (tippersRes.data as any[]) || [],
      events: (eventsRes.data as any[]) || [],
    };
  };

  const { data, error, isLoading, mutate } = useSWR(
    user?.id && hostId ? "/top-tippers" : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    tippers: data?.tippers || [],
    events: data?.events || [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
