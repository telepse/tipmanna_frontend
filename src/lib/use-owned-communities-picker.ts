"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { getMyCommunitiesAction } from "@/actions/communities";
import type { HostCommunityPickerOption } from "@/components/dashboard/host-community-picker-dialog";
import type { RootState } from "@/redux/store";

export type OwnedCommunityPickerRow = HostCommunityPickerOption & {
  tvActivatedAt?: string | null;
  tvHostPaused?: boolean | null;
};

export function useOwnedCommunitiesPicker(enabled: boolean) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [communities, setCommunities] = useState<OwnedCommunityPickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authToken) {
      setCommunities([]);
      setError("Sign in to load communities.");
      setHasLoaded(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMyCommunitiesAction(authToken);
      if (!res.success || !res.data) {
        setError(res.message ?? "Could not load communities.");
        setCommunities([]);
        return;
      }
      const raw = res.data as {
        owned?: Array<{
          id: string;
          name: string;
          tvActivatedAt?: string | null;
          tvHostPaused?: boolean | null;
        }>;
      };
      setCommunities(
        (raw.owned ?? []).map(c => ({
          id: c.id,
          name: c.name,
          tvActivatedAt: c.tvActivatedAt,
          tvHostPaused: c.tvHostPaused,
        }))
      );
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [authToken]);

  useEffect(() => {
    if (!enabled) {
      setHasLoaded(false);
      return;
    }
    void load();
  }, [enabled, load]);

  const effectiveLoading = enabled && (!hasLoaded || loading);

  return { communities, loading: effectiveLoading, error, reload: load };
}
