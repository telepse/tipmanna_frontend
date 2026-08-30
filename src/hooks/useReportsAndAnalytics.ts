/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import {
  getHostEventSummaries,
  getHostTransactionsAction,
} from "@/actions/host";
import { useHostID } from "./useHostID";
import type { RootState } from "@/redux/store";
import { unwrapPaginatedList } from "@/lib/unwrap-paginated-list";

interface ReportsData {
  events: any[];
  transactions: any[];
}

export function useReportsAndAnalytics() {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostId = useHostID();

  const fetcher = async (): Promise<ReportsData> => {
    if (!hostId || !user?.id) return { events: [], transactions: [] };

    const [eventsRes, transactionsRes] = await Promise.all([
      getHostEventSummaries(hostId),
      getHostTransactionsAction(hostId),
    ]);

    return {
      events: unwrapPaginatedList(eventsRes.data),
      transactions: unwrapPaginatedList(transactionsRes.data),
    };
  };

  const { data, error, isLoading, mutate } = useSWR(
    user?.id && hostId ? "/reports-and-analytics" : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    events: data?.events || [],
    transactions: data?.transactions || [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
