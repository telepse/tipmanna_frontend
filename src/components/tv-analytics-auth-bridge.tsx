"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";

import { setTvAnalyticsAuth } from "@/lib/tvAnalytics";
import type { RootState } from "@/redux/store";

/** Keeps TV analytics batches aligned with auth for server-side actor resolution. */
export function TvAnalyticsAuthBridge() {
  const { token, user } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (user?.role !== "VISITOR" || !token?.trim()) {
      setTvAnalyticsAuth(null, null);
      return;
    }
    setTvAnalyticsAuth(token, user.id);
  }, [token, user?.id, user?.role]);

  return null;
}
