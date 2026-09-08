"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

import { getAuthToken } from "@/lib/getAuthToken";
import type { RootState } from "@/redux/store";

const PRESENCE_INTERVAL_MS = 45_000;

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

/** Keeps backend presence key warm while the tab is visible (suppresses push). */
export function NotificationPresencePinger() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const requiresVerification = useSelector(
    (s: RootState) => s.auth.requiresVerification
  );
  const user = useSelector((s: RootState) => s.auth.user);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (
      !user ||
      user.role === "VISITOR" ||
      (!isAuthenticated && !requiresVerification)
    ) {
      clear();
      return;
    }

    const ping = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      const token = getAuthToken();
      if (!token) return;
      void fetch(`${apiBase()}/notifications/presence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).catch(() => undefined);
    };

    ping();
    intervalRef.current = setInterval(ping, PRESENCE_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clear();
    };
  }, [isAuthenticated, requiresVerification, user]);

  return null;
}
