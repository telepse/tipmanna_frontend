"use client";

import {
  useHostSessionContext,
  useHostSessionContextOptional,
  type HostSessionContextValue,
} from "@/contexts/host-session-context";
import {
  getHostUserFromCookies,
  hasActiveHostSession,
  type HostUserCookie,
} from "@/lib/host-session-client";

export type HostSessionState = {
  hostUser: HostUserCookie | null;
  isActive: boolean;
  isLoading: boolean;
  hostId: string | null;
  eventSlug: string | null;
  username: string | null;
  eventCode: string | null;
  refresh: () => Promise<void>;
};

function mapContext(ctx: HostSessionContextValue): HostSessionState {
  return {
    hostUser: ctx.hostUser,
    isActive: ctx.isActive,
    isLoading: ctx.isLoading,
    hostId: ctx.hostId,
    eventSlug: ctx.eventSlug,
    username: ctx.username,
    eventCode: ctx.eventCode,
    refresh: ctx.refresh,
  };
}

/** Host session from server-verified probe when inside HostSessionProvider. */
export function useHostSession(): HostSessionState {
  const ctx = useHostSessionContextOptional();

  if (ctx) {
    return mapContext(ctx);
  }

  const hostUser = getHostUserFromCookies();
  const hostId = hostUser?.id ?? null;
  const isActive = hostId ? hasActiveHostSession(hostId) : false;

  return {
    hostUser,
    isActive,
    isLoading: false,
    hostId: isActive ? hostId : null,
    eventSlug: isActive ? (hostUser?.eventSlug ?? null) : null,
    username: isActive ? (hostUser?.username ?? null) : null,
    eventCode: isActive ? (hostUser?.eventCode ?? null) : null,
    refresh: async () => undefined,
  };
}

/** Requires dashboard HostSessionProvider. */
export function useVerifiedHostSession(): HostSessionState {
  return mapContext(useHostSessionContext());
}
