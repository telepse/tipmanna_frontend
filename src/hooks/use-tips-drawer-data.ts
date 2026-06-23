"use client";

import useSWR from "swr";
import {
  fetchTipsDrawerCached,
  getCachedTipsDrawer,
  tipsDrawerKey,
} from "@/lib/drawer-prefetch-cache";
import type { TipFeedRow } from "@/components/events/tips-feed-panel";

export function useTipsDrawerData(
  eventId: string,
  channelId: string | null,
  scope: "event" | "video",
  enabled: boolean
) {
  const eid = eventId?.trim() ?? "";
  const swrKey =
    enabled && eid
      ? tipsDrawerKey(eid, channelId, scope)
      : null;

  const { data, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    async () => {
      const cached = getCachedTipsDrawer(eid, channelId, scope);
      if (cached) return cached;
      return fetchTipsDrawerCached(eid, channelId, scope);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 20_000,
      keepPreviousData: true,
    }
  );

  const items: TipFeedRow[] = data?.items ?? [];

  return {
    items,
    loading: enabled && (isLoading || isValidating) && !data,
    refresh: mutate,
  };
}
