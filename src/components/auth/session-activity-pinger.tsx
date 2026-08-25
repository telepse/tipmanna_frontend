"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import type { AppDispatch } from "@/redux/store";
import { getAuthToken } from "@/lib/getAuthToken";
import { setCredentials } from "@/features/auth-slice";
import { persistAuthSession, persistHostSession } from "@/lib/session-client";
import { getHostUserFromCookies } from "@/lib/host-session-client";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

async function applyRotatedToken(
  token: string,
  role: string,
  user: RootState["auth"]["user"]
) {
  if (!user) return;
  const r = role.toLowerCase();
  if (r === "host") {
    const hostUser = getHostUserFromCookies();
    if (hostUser?.id) {
      await persistHostSession(
        token,
        {
          id: hostUser.id,
          fullName: hostUser.username ?? "",
          email: hostUser.email ?? "",
          username: hostUser.username ?? "",
          role: "HOST",
          eventSlug: hostUser.eventSlug ?? null,
          eventCode: hostUser.eventCode ?? null,
        },
        { expiresDays: 7 }
      );
    }
    return;
  }
  await persistAuthSession(token, user, { expiresDays: 60 });
}

/** Throttled session touch — keeps tipper/host sliding windows alive on activity. */
export function SessionActivityPinger() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role === "VISITOR") return;

    const touch = async () => {
      const now = Date.now();
      if (now - lastTouchRef.current < TOUCH_INTERVAL_MS) return;
      lastTouchRef.current = now;
      const token = getAuthToken();
      if (!token) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/session/touch`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          token?: string;
          role?: string;
        };
        if (data.token && user) {
          dispatch(setCredentials({ user, token: data.token }));
          await applyRotatedToken(data.token, data.role ?? user.role, user);
        }
      } catch {
        /* best-effort */
      }

      await fetch("/api/auth/host-session/touch", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    };

    void touch();
    window.addEventListener("focus", touch);
    document.addEventListener("visibilitychange", touch);

    return () => {
      window.removeEventListener("focus", touch);
      document.removeEventListener("visibilitychange", touch);
    };
  }, [dispatch, isAuthenticated, user]);

  return null;
}
