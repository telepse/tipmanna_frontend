"use client";

import { useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/getAuthToken";
import { clearHostSession } from "@/lib/session-client";
import {
  HOST_SESSION_TOUCHED_EVENT,
  type HostSessionTouchedDetail,
} from "@/lib/host-session-probe";
import { wasHostSessionRecentlyVerified } from "@/lib/host-session-grant";
import { useHostSessionContextOptional } from "@/contexts/host-session-context";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_TOUCH_DELAY_MS = 3_000;

async function touchHostSession(): Promise<Response | null> {
  return fetch("/api/auth/host-session/touch", {
    method: "POST",
    credentials: "include",
  }).catch(() => null);
}

/** Refreshes host session cookies while the user is on the host dashboard. */
export function HostDashboardSessionTouch() {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostSession = useHostSessionContextOptional();
  const hostId = hostSession?.hostId ?? null;
  const hostSessionLoading = hostSession?.isLoading ?? false;
  const refreshHostSession = hostSession?.refresh;
  const lastTouchRef = useRef(0);
  const initialTouchDoneRef = useRef(false);

  useEffect(() => {
    const touch = async (options?: { force?: boolean }) => {
      if (hostSessionLoading && !options?.force) return;

      const now = Date.now();
      if (!options?.force && now - lastTouchRef.current < TOUCH_INTERVAL_MS) {
        return;
      }
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
        ).catch(() => {});
      }

      let res = await touchHostSession();
      if (!res) return;

      if (res.status === 401 || res.status === 403) {
        res = await touchHostSession();
        if (res?.status === 401 || res?.status === 403) {
          await clearHostSession();
        }
        return;
      }

      if (res.ok) {
        try {
          const body = (await res.json()) as HostSessionTouchedDetail;
          window.dispatchEvent(
            new CustomEvent<HostSessionTouchedDetail>(
              HOST_SESSION_TOUCHED_EVENT,
              {
                detail: {
                  active: true,
                  hostSessionExpiresAt: body.hostSessionExpiresAt,
                  hostId: hostId ?? undefined,
                },
              }
            )
          );
        } catch {
          await refreshHostSession?.();
        }
      }
    };

    if (!initialTouchDoneRef.current) {
      initialTouchDoneRef.current = true;
      const hostCookieId = hostSession?.hostId ?? undefined;
      if (!wasHostSessionRecentlyVerified(hostCookieId)) {
        window.setTimeout(
          () => void touch({ force: true }),
          INITIAL_TOUCH_DELAY_MS
        );
      }
    }

    const id = window.setInterval(() => void touch(), TOUCH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [hostId, hostSessionLoading, refreshHostSession, user?.id]);

  return null;
}
