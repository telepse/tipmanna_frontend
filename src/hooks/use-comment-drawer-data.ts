"use client";

import useSWR from "swr";
import {
  fetchCommentDrawerCached,
  getCachedCommentDrawer,
  commentDrawerKey,
  invalidateCommentDrawer,
} from "@/lib/drawer-prefetch-cache";
import type { CommentDrawerData } from "@/actions/messages";

export function useCommentDrawerData(
  eventId: string,
  channelId: string | null,
  enabled: boolean,
  refreshKey = 0
) {
  const eid = eventId?.trim() ?? "";
  const cid = channelId?.trim() ?? "";
  const swrKey =
    enabled && eid && cid
      ? [commentDrawerKey(eid, cid), refreshKey] as const
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    async () => {
      const cached = getCachedCommentDrawer(eid, cid);
      if (cached && refreshKey === 0) return cached;
      return fetchCommentDrawerCached(eid, cid, { force: refreshKey > 0 });
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
      keepPreviousData: true,
    }
  );

  const revalidate = () => {
    invalidateCommentDrawer(eid, cid);
    return mutate();
  };

  return {
    drawerData: (data ?? null) as CommentDrawerData | null,
    loading: enabled && (isLoading || isValidating) && !data,
    error,
    revalidate,
  };
}
