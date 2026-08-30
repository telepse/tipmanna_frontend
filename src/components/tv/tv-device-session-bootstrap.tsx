"use client";

import { useEffect } from "react";
import { getDeviceKey } from "@/lib/getAuthToken";

/**
 * TV Strategy B: ensure stable deviceKey for analytics/notifications without
 * creating a Visitor account or Redux auth on page load.
 */
export function TvDeviceSessionBootstrap() {
  useEffect(() => {
    getDeviceKey();
  }, []);

  return null;
}
