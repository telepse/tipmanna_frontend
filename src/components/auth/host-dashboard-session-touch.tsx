"use client";

import { useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/getAuthToken";
import { clearHostSession } from "@/lib/session-client";
import {
  HOST_SESSION_TOUCHED_EVENT,
  type HostSessionTouchedDetail,
} from "@/lib/host-session-probe";
import { useHostSessionContextOptional } from "@/contexts/host-session-context";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_TOUCH_DELAY_MS = 3_000;

/** Refreshes host session cookies while the user is on the host dashboard. */
export function HostDashboardSessionTouch() {
  const user = useSelector((s: RootState) => s.auth.user);
  const hostSession = useHostSessionContextOptional();
  const lastTouchRef = useRef(0);
  const initialTouchDoneRef = useRef(false);

  useEffect(() => {
    const touch = async (options?: { force?: boolean }) => {
      if (hostSession?.isLoading && !options?.force) return;

      const now = Date.now();
      if (
        !options?.force &&
        now - lastTouchRef.current < TOUCH_INTERVAL_MS
      ) {
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

      const res = await fetch("/api/auth/host-session/touch", {
        method: "POST",
        credentials: "include",
      }).catch(() => null);

      if (!res) return;

      if (res.status === 401 || res.status === 403) {
        await clearHostSession();
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
                  hostId: hostSession?.hostId ?? undefined,
                },
              }
            )
          );
        } catch {
          await hostSession?.refresh();
        }
      }
    };

    if (!initialTouchDoneRef.current) {
      initialTouchDoneRef.current = true;
      window.setTimeout(() => void touch({ force: true }), INITIAL_TOUCH_DELAY_MS);
    }

    const id = window.setInterval(() => void touch(), TOUCH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [hostSession, user]);

  return null;
}
