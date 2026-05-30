/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import { getHostEventsAction, getHostFeesAction } from "@/actions/events";
import type { RootState } from "@/redux/store";

interface FeesData {
  events: any[];
  hostCredit: number;
  appliedFees: number;
  hostBonus: number;
}

export function useHostFees() {
  const user = useSelector((s: RootState) => s.auth.user);

  const fetcher = async (): Promise<FeesData> => {
    const [eventsRes, feesRes] = await Promise.all([
      getHostEventsAction(),
      getHostFeesAction(),
    ]);

    return {
      events: (eventsRes.data as any[]) || [],
      hostCredit: (feesRes.data as any).hostCredit as number,
      appliedFees: (feesRes.data as any).appliedFees as number,
      hostBonus: (feesRes.data as any).hostBonus as number,
    };
  };

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? "/host-fees" : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    events: data?.events || [],
    hostCredit: data?.hostCredit ?? 0,
    appliedFees: data?.appliedFees ?? 0,
    hostBonus: data?.hostBonus ?? 0,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
