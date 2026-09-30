"use client";

import useSWR from "swr";
import type { HostCreatorPublicProfile } from "@/actions/host-creator";
import {
  creatorProfileKey,
  fetchCreatorProfileCached,
  getCachedCreatorProfile,
  normalizeCreatorUsername,
} from "@/lib/drawer-prefetch-cache";

export function useCreatorDrawerData(
  username: string | null | undefined,
  enabled: boolean
) {
  const handle = normalizeCreatorUsername(username);
  const swrKey = enabled && handle ? creatorProfileKey(handle) : null;
  const fallbackProfile =
    enabled && handle ? getCachedCreatorProfile(handle) : undefined;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => fetchCreatorProfileCached(handle),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      fallbackData: fallbackProfile ?? undefined,
    }
  );

  const profile = (data ??
    fallbackProfile ??
    null) as HostCreatorPublicProfile | null;

  return {
    profile,
    loading: enabled && !profile && isLoading,
    error,
    mutate,
  };
}
