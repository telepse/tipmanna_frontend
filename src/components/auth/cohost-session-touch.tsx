"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { getAuthToken } from "@/lib/getAuthToken";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Keeps cohost sliding session alive while viewing an event room. */
export function CohostSessionTouch() {
  const tag = useSelector((s: RootState) => s.auth.tag);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    const isCohost = tag === "COHOST";
    if (!isCohost) return;

    const touch = () => {
      const now = Date.now();
      if (now - lastTouchRef.current < TOUCH_INTERVAL_MS) return;
      lastTouchRef.current = now;
      const token = getAuthToken();
      if (!token) return;
      void fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/session/touch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      ).catch(() => {});
    };

    touch();
    window.addEventListener("focus", touch);
    document.addEventListener("visibilitychange", touch);
    return () => {
      window.removeEventListener("focus", touch);
      document.removeEventListener("visibilitychange", touch);
    };
  }, [tag]);

  return null;
}
