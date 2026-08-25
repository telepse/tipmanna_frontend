"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { getHostLinkAction, type HostLinkResponse } from "@/actions/auth";
import { getAuthToken } from "@/lib/getAuthToken";
import {
  clearStaleHostSessionIfMismatch,
  getHostUserFromCookies,
  hasActiveHostSession,
} from "@/lib/host-session-client";

export type HostCapability =
  | { status: "loading" }
  | { status: "none" }
  | {
      status: "active";
      hostId: string;
      eventSlug: string | null;
      username: string | null;
    }
  | { status: "stale"; hostId: string; eventSlug: string | null };

type Options = {
  /** Skip fetch when unauthenticated or visitor. */
  enabled?: boolean;
};

export function useHostCapability(options?: Options) {
  const enabled = options?.enabled ?? true;
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [link, setLink] = useState<HostLinkResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const refreshEpochRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled || !isAuthenticated || !user) {
      setLink(null);
      setLoading(false);
      return;
    }
    if (user.role === "VISITOR") {
      setLink(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const token = getAuthToken();
    const res = await getHostLinkAction(token);
    refreshEpochRef.current += 1;
    if (res.success && res.data) {
      setLink(res.data);
      if (res.data.hostId) {
        await clearStaleHostSessionIfMismatch(res.data.hostId);
      }
    } else {
      setLink(null);
    }
    setLoading(false);
  }, [enabled, isAuthenticated, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hostUser = getHostUserFromCookies();
  const linkedHostId = link?.hostId ?? null;
  const hostSessionActive = linkedHostId
    ? hasActiveHostSession(linkedHostId)
    : hasActiveHostSession(hostUser?.id);

  const capability: HostCapability = (() => {
    if (!enabled || !isAuthenticated || !user || user.role === "VISITOR") {
      return { status: "none" };
    }
    if (loading) return { status: "loading" };
    if (!link?.hasHost || !link.hostId) {
      return { status: "none" };
    }
    if (hostSessionActive) {
      const cookieHost = getHostUserFromCookies();
      return {
        status: "active",
        hostId: link.hostId,
        eventSlug: cookieHost?.eventSlug ?? link.eventSlug,
        username: link.username,
      };
    }
    return {
      status: "stale",
      hostId: link.hostId,
      eventSlug: link.eventSlug,
    };
  })();

  const canReadAsHost =
    capability.status === "active" || capability.status === "stale";
  const canWriteAsHost = capability.status === "active";

  return {
    capability,
    canReadAsHost,
    canWriteAsHost,
    hostSessionActive,
    refresh,
    /** Host JWT from host session cookie route — never the primary tipper token. */
    getHostAuthToken: (): string | null => null,
  };
}
