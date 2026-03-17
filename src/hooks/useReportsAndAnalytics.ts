/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";

// Local imports
import {
  getHostEventSummaries,
  getHostTransactionsAction,
} from "@/actions/host";
import { useHostID } from "./useHostID";

interface ReportsData {
  events: any[]; // replace 'any' with your Event type
  transactions: any[]; // replace 'any' with your Tipper type if you have it
}

export function useReportsAndAnalytics() {
  const hostId = useHostID();

  const fetcher = async (): Promise<ReportsData> => {
    if (!hostId) return { events: [], transactions: [] };

    const [eventsRes, transactionsRes] = await Promise.all([
      getHostEventSummaries(hostId),
      getHostTransactionsAction(hostId),
    ]);

    return {
      events: eventsRes.data || [],
      transactions: transactionsRes.data || [],
    };
  };

  const { data, error, isLoading, mutate } = useSWR(
    "/reports-and-analytics",
    fetcher,
    {
      revalidateOnFocus: false, // don’t refetch every time tab regains focus
    }
  );

  return {
    events: data?.events || [],
    transactions: data?.transactions || [],
    isLoading,
    isError: !!error,
    refresh: mutate, // call this to re-fetch manually
  };
}
