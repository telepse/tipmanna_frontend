"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import type { RootState } from "@/redux/store";
import type { AppDispatch } from "@/redux/store";
import { getAuthToken } from "@/lib/getAuthToken";
import { setCredentials } from "@/features/auth-slice";
import { persistAuthSession, persistHostSession } from "@/lib/session-client";
import { getHostUserFromCookies } from "@/lib/host-session-client";
import {
  notifyHostSessionTouched,
  HOST_SESSION_CLEARED_EVENT,
} from "@/lib/host-session-probe";
import { notifyEmailVerificationRequired } from "@/lib/email-verification-events";

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
  const pathname = usePathname();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const requiresVerification = useSelector(
    (s: RootState) => s.auth.requiresVerification
  );
  const user = useSelector((s: RootState) => s.auth.user);
  const lastTouchRef = useRef(0);
  const onHostDashboard = pathname.startsWith("/host");

  useEffect(() => {
    if (!user || user.role === "VISITOR") return;
    const shouldTouch = isAuthenticated || requiresVerification;
    if (!shouldTouch) return;

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
          verified?: boolean;
        };
        if (data.verified === false) {
          notifyEmailVerificationRequired({
            email: user.email,
            accountType: "TIPPER",
          });
          return;
        }
        if (data.token && user) {
          dispatch(
            setCredentials({
              user,
              token: data.token,
              requiresVerification: false,
            })
          );
          await applyRotatedToken(data.token, data.role ?? user.role, user);
        }
      } catch {
        /* best-effort */
      }

      if (onHostDashboard) {
        return;
      }

      await fetch("/api/auth/host-session/touch", {
        method: "POST",
        credentials: "include",
      })
        .then(async res => {
          if (res.status === 401 || res.status === 403) {
            window.dispatchEvent(new CustomEvent(HOST_SESSION_CLEARED_EVENT));
          } else if (res.ok) {
            try {
              const body = (await res.json()) as {
                hostSessionExpiresAt?: string;
              };
              const hostUser = getHostUserFromCookies();
              notifyHostSessionTouched({
                active: true,
                hostSessionExpiresAt: body.hostSessionExpiresAt,
                hostId: hostUser?.id,
              });
            } catch {
              /* noop */
            }
          }
        })
        .catch(() => undefined);
    };

    void touch();
    window.addEventListener("focus", touch);
    document.addEventListener("visibilitychange", touch);

    return () => {
      window.removeEventListener("focus", touch);
      document.removeEventListener("visibilitychange", touch);
    };
  }, [dispatch, isAuthenticated, onHostDashboard, requiresVerification, user]);

  return null;
}
