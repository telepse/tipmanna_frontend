/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { useSelector } from "react-redux";

import {
  getMyTippedVideos,
  getSavedVideosForTipper,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import { fetchSavedHostsMe } from "@/lib/save-host-client";
import { getAuthToken } from "@/lib/getAuthToken";
import {
  getCachedProfileDrawerData,
  invalidateProfileDrawerCache,
  prefetchProfileDrawerData,
} from "@/lib/drawer-prefetch-cache";
import { normalizeSavedVideosList } from "@/lib/save-video-client";
import type { TippedVideoSummary } from "@/components/tipper/tipper-profile-client";
import type { RootState } from "@/redux/store";

async function loadProfileDrawerBundle(userId: string) {
  const cached = getCachedProfileDrawerData();
  if (cached) return cached;

  const token = getAuthToken();
  const [causesRes, eventsRes, tippedRes, savedRes, videosRes, hosts] =
    await Promise.all([
      getAllCausesAction(),
      getTippedEventsForTipper(token),
      getTotalAmountTippedByTipper(token),
      getSavedVideosForTipper(token),
      getMyTippedVideos(token),
      fetchSavedHostsMe(),
    ]);

  return {
    causes:
      causesRes.success && Array.isArray(causesRes.data) ? causesRes.data : [],
    tipperEvents:
      eventsRes.success && Array.isArray(eventsRes.data) ? eventsRes.data : [],
    iTipped: typeof tippedRes.data === "number" ? tippedRes.data : 0,
    savedContents: savedRes.success
      ? normalizeSavedVideosList(savedRes.data)
      : [],
    tippedVideos:
      videosRes.success && Array.isArray(videosRes.data)
        ? (videosRes.data as TippedVideoSummary[])
        : [],
    savedHosts: hosts,
  };
}

export function useProfileDrawerData(enabled = true) {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const swrKey =
    enabled && userId && isAuthenticated
      ? (["profile-drawer", userId] as const)
      : enabled
        ? (["profile-drawer-causes"] as const)
        : null;

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      if (!userId || !isAuthenticated) {
        const causesRes = await getAllCausesAction();
        return {
          causes:
            causesRes.success && Array.isArray(causesRes.data)
              ? causesRes.data
              : [],
          tipperEvents: [] as any[],
          iTipped: 0,
          savedContents: [] as any[],
          tippedVideos: [] as TippedVideoSummary[],
          savedHosts: [] as Awaited<ReturnType<typeof fetchSavedHostsMe>>,
        };
      }
      return loadProfileDrawerBundle(userId);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    }
  );

  const refresh = useCallback(async () => {
    invalidateProfileDrawerCache();
    return mutate();
  }, [mutate]);

  useEffect(() => {
    if (!enabled) return;
    const onSaves = () => void refresh();
    window.addEventListener("tipmanna:saves-changed", onSaves);
    return () => window.removeEventListener("tipmanna:saves-changed", onSaves);
  }, [enabled, refresh]);

  useEffect(() => {
    if (enabled && isAuthenticated && userId) {
      void prefetchProfileDrawerData();
    }
  }, [enabled, isAuthenticated, userId]);

  return {
    tipperEvents: data?.tipperEvents ?? [],
    iTipped: data?.iTipped ?? 0,
    causes: data?.causes ?? [],
    savedContents: data?.savedContents ?? [],
    tippedVideos: data?.tippedVideos ?? [],
    savedHosts: data?.savedHosts ?? [],
    loading: Boolean(swrKey) && isLoading && !data,
    refresh,
  };
}
