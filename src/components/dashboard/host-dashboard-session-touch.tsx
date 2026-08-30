"use client";

import { useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/getAuthToken";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { clearHostSession } from "@/lib/session-client";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Refreshes host session cookies while the user is on the host dashboard. */
export function HostDashboardSessionTouch() {
  const user = useSelector((s: RootState) => s.auth.user);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    const touch = async () => {
      const now = Date.now();
      if (now - lastTouchRef.current < TOUCH_INTERVAL_MS) return;
      lastTouchRef.current = now;

      const primaryToken = getAuthToken();
      if (primaryToken) {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/session/touch`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${primaryToken}`,
              "Content-Type": "application/json",
            },
          }
        ).catch(() => undefined);
      }

      const hostTouch = await fetch("/api/auth/host-session/touch", {
        method: "POST",
        credentials: "include",
      }).catch(() => null);

      if (hostTouch && (hostTouch.status === 401 || hostTouch.status === 403)) {
        await clearHostSession();
      }
    };

    void touch();
    const id = window.setInterval(() => void touch(), TOUCH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [user]);

  return null;
}
