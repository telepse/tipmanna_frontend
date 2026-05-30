/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import {
  getMyTippedVideos,
  getSavedVideosForTipper,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import { getAuthToken } from "@/lib/getAuthToken";
import { normalizeSavedVideosList } from "@/lib/save-video-client";
import type { TippedVideoSummary } from "@/components/tipper/tipper-profile-client";
import type { RootState } from "@/redux/store";

export function useProfileDrawerData(enabled = true) {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const [tipperEvents, setTipperEvents] = useState<any[]>([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState<any[]>([]);
  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [tippedVideos, setTippedVideos] = useState<TippedVideoSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const token = getAuthToken();
    const [causesRes, eventsRes, tippedRes, savedRes, videosRes] =
      await Promise.all([
        getAllCausesAction(),
        userId && isAuthenticated
          ? getTippedEventsForTipper(token)
          : Promise.resolve({ success: true, data: [] as any[] }),
        userId && isAuthenticated
          ? getTotalAmountTippedByTipper(token)
          : Promise.resolve({ success: true, data: 0 }),
        userId && isAuthenticated
          ? getSavedVideosForTipper(token)
          : Promise.resolve({ success: true, data: [] }),
        userId && isAuthenticated
          ? getMyTippedVideos(token)
          : Promise.resolve({ success: true, data: [] }),
      ]);

    setCauses(
      causesRes.success && Array.isArray(causesRes.data) ? causesRes.data : []
    );
    setTipperEvents(
      eventsRes.success && Array.isArray(eventsRes.data) ? eventsRes.data : []
    );
    setITipped(typeof tippedRes.data === "number" ? tippedRes.data : 0);
    setSavedContents(
      savedRes.success ? (normalizeSavedVideosList(savedRes.data) as any[]) : []
    );
    setTippedVideos(
      videosRes.success && Array.isArray(videosRes.data)
        ? (videosRes.data as TippedVideoSummary[])
        : []
    );
    setLoading(false);
  }, [enabled, isAuthenticated, userId]);

  useEffect(() => {
    if (!enabled) return;
    if (!userId || !isAuthenticated) {
      setTipperEvents([]);
      setITipped(0);
      setSavedContents([]);
      setTippedVideos([]);
      void getAllCausesAction().then(res => {
        setCauses(res.success && Array.isArray(res.data) ? res.data : []);
      });
      return;
    }
    void refresh();
  }, [enabled, isAuthenticated, refresh, userId]);

  useEffect(() => {
    if (!enabled) return;
    const onSaves = () => void refresh();
    window.addEventListener("tipmanna:saves-changed", onSaves);
    return () => window.removeEventListener("tipmanna:saves-changed", onSaves);
  }, [enabled, refresh]);

  return {
    tipperEvents,
    iTipped,
    causes,
    savedContents,
    tippedVideos,
    loading,
    refresh,
  };
}
