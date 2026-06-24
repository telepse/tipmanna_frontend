"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    enabled && eid ? tipsDrawerKey(eid, channelId, scope) : null;

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

  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (scope === "video" && enabled && eid) {
      void fetchTipsDrawerCached(eid, channelId, "video");
    }
  }, [scope, enabled, eid, channelId]);

  const loadMore = useCallback(async () => {
    if (!enabled || !eid || !data?.hasMore || !data.nextCursor) return;
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = await fetchTipsDrawerCached(eid, channelId, scope, {
        cursor: data.nextCursor,
        append: true,
      });
      if (next) await mutate(next, { revalidate: false });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [enabled, eid, channelId, scope, data?.hasMore, data?.nextCursor, mutate]);

  const items: TipFeedRow[] = data?.items ?? [];

  return {
    items,
    loading: enabled && (isLoading || isValidating) && !data,
    loadingMore,
    hasMore: Boolean(data?.hasMore),
    loadMore,
    refresh: mutate,
  };
}
