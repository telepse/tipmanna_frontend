"use client";

import { useEffect, useRef } from "react";

/** Poll broadcast status while provider jobs are in flight (mock/real). */
export function useNativeBroadcastStatusPoll(
  active: boolean,
  refresh: () => void | Promise<void>,
  intervalMs = 3000
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      void refreshRef.current();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
}
