/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";

// Local imports
import { getClientTokenFromPersist } from "@/lib/getClientToken";
import { getHostEventsAction, getHostFeesAction } from "@/actions/events";

interface FeesData {
  events: any[]; // replace 'any' with your Event type
  hostCredit: number;
  appliedFees: number;
  hostBonus: number;
}

export function useHostFees() {
  const token = getClientTokenFromPersist();

  const fetcher = async (): Promise<FeesData> => {
    const [eventsRes, feesRes] = await Promise.all([
      getHostEventsAction(token!),
      getHostFeesAction(token!),
    ]);

    return {
      events: eventsRes.data || [],
      hostCredit: feesRes.data.hostCredit,
      appliedFees: feesRes.data.appliedFees,
      hostBonus: feesRes.data.hostBonus,
    };
  };

  const { data, error, isLoading, mutate } = useSWR("/host-fees", fetcher, {
    revalidateOnFocus: false, // don’t refetch every time tab regains focus
  });

  return {
    events: data?.events || [],
    hostCredit: data?.hostCredit ?? 0,
    appliedFees: data?.appliedFees ?? 0,
    hostBonus: data?.hostBonus ?? 0,
    isLoading,
    isError: !!error,
    refresh: mutate, // call this to re-fetch manually
  };
}
