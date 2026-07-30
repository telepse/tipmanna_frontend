"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostEventsAction } from "@/actions/events";
import { unwrapPaginatedList } from "@/lib/unwrap-paginated-list";
import type { RootState } from "@/redux/store";
import type { Event } from "@/types";

export function useHostEvents() {
  const user = useSelector((s: RootState) => s.auth.user);

  const fetcher = async (): Promise<Event[]> => {
    const response = await getHostEventsAction(undefined, { limit: 100 });
    return unwrapPaginatedList<Event>(response.data);
  };

  const {
    data: events,
    error,
    isLoading,
    mutate,
  } = useSWR<Event[]>(user?.id ? "/host-events" : null, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    events: Array.isArray(events) ? events : [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
