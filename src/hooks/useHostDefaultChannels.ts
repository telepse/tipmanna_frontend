"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import {
  getHostDefaultChannelsAction,
  type HostDefaultChannelItem,
} from "@/actions/events";
import type { RootState } from "@/redux/store";

export const HOST_DEFAULT_CHANNELS_SWR_KEY = "/host-default-channels";

export function useHostDefaultChannels() {
  const user = useSelector((s: RootState) => s.auth.user);

  const fetcher = async (): Promise<HostDefaultChannelItem[]> => {
    const res = await getHostDefaultChannelsAction();
    if (!res.success || !res.data || !Array.isArray(res.data.items)) {
      return [];
    }
    return res.data.items;
  };

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? HOST_DEFAULT_CHANNELS_SWR_KEY : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  return {
    items: data ?? [],
    hasData: data !== undefined,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
