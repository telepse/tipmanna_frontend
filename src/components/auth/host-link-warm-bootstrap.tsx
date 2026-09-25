"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { getAuthToken } from "@/lib/getAuthToken";
import { getHostUserFromCookies } from "@/lib/host-session-client";
import { warmHostLink } from "@/lib/host-link-cache";

/** Tier A: prefetch host-link once per signed-in tipper session (no verify on Explore/TV). */
export function HostLinkWarmBootstrap() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);
  const warmedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const hostCookie = getHostUserFromCookies();
    const shouldWarm =
      (isAuthenticated && Boolean(user) && user?.role !== "VISITOR") ||
      Boolean(hostCookie?.id);

    if (!shouldWarm) {
      warmedKeyRef.current = null;
      return;
    }

    const token = getAuthToken()?.trim();
    const userId = user?.id;
    if (!userId || !token) return;

    const key = `${userId}:${user.role ?? ""}`;
    if (warmedKeyRef.current === key) return;
    warmedKeyRef.current = key;

    warmHostLink(userId, token);
  }, [isAuthenticated, user?.id, user?.role]);

  return null;
}
