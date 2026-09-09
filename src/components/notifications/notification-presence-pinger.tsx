"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

import type { RootState } from "@/redux/store";

const PRESENCE_INTERVAL_MS = 45_000;

/** Keeps backend presence keys warm while the tab is visible (suppresses push). */
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
      void fetch("/api/notifications/presence-ping", {
        method: "POST",
        credentials: "include",
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
