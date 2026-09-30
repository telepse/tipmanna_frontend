"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostEventsTabsAction } from "@/actions/events";
import type { RootState } from "@/redux/store";
import type { Event } from "@/types/event.types";

export const HOST_EVENTS_TABS_SWR_KEY = "/host-events-tabs";

type HostEventsTabsData = {
  all: Event[];
  approved: Event[];
  pending: Event[];
};

export function useHostEventsTabs() {
  const user = useSelector((s: RootState) => s.auth.user);

  const fetcher = async (): Promise<HostEventsTabsData> => {
    const response = await getHostEventsTabsAction();
    const data = response.data as HostEventsTabsData | undefined;
    return {
      all: Array.isArray(data?.all) ? data.all : [],
      approved: Array.isArray(data?.approved) ? data.approved : [],
      pending: Array.isArray(data?.pending) ? data.pending : [],
    };
  };

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? HOST_EVENTS_TABS_SWR_KEY : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  return {
    all: data?.all ?? [],
    approved: data?.approved ?? [],
    pending: data?.pending ?? [],
    hasData: data !== undefined,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
