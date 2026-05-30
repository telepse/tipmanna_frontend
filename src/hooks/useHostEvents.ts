"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostEventsAction } from "@/actions/events";
import type { RootState } from "@/redux/store";
import type { Event } from "@/types";

export function useHostEvents() {
  const user = useSelector((s: RootState) => s.auth.user);

  const fetcher = async (): Promise<Event[]> => {
    const response = await getHostEventsAction();
    const data = response.data;
    return Array.isArray(data) ? (data as Event[]) : [];
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
