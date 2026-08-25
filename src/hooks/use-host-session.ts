"use client";

import { useMemo } from "react";
import {
  getHostUserFromCookies,
  hasActiveHostSession,
  type HostUserCookie,
} from "@/lib/host-session-client";

export type HostSessionState = {
  hostUser: HostUserCookie | null;
  isActive: boolean;
  hostId: string | null;
  eventSlug: string | null;
  username: string | null;
  eventCode: string | null;
};

/** Stable host identity from the host session cookie (not primary Redux). */
export function useHostSession(): HostSessionState {
  return useMemo(() => {
    const hostUser = getHostUserFromCookies();
    const hostId = hostUser?.id ?? null;
    const isActive = hostId ? hasActiveHostSession(hostId) : false;
    return {
      hostUser,
      isActive,
      hostId: isActive ? hostId : null,
      eventSlug: isActive ? (hostUser?.eventSlug ?? null) : null,
      username: isActive ? (hostUser?.username ?? null) : null,
      eventCode: isActive ? (hostUser?.eventCode ?? null) : null,
    };
  }, []);
}
