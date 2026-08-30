"use client";

import useSWR from "swr";
import type { HostCreatorPublicProfile } from "@/actions/host-creator";
import {
  creatorProfileKey,
  fetchCreatorProfileCached,
  normalizeCreatorUsername,
} from "@/lib/drawer-prefetch-cache";

export function useCreatorDrawerData(
  username: string | null | undefined,
  enabled: boolean
) {
  const handle = normalizeCreatorUsername(username);
  const swrKey = enabled && handle ? creatorProfileKey(handle) : null;

  const { data, error, isLoading, isValidating } = useSWR(
    swrKey,
    async () => fetchCreatorProfileCached(handle),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    }
  );

  return {
    profile: (data ?? null) as HostCreatorPublicProfile | null,
    loading: enabled && (isLoading || isValidating) && !data,
    error,
  };
}
