"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { getHostLinkAction, type HostLinkResponse } from "@/actions/auth";
import { getAuthToken } from "@/lib/getAuthToken";
import {
  clearStaleHostSessionIfMismatch,
  hasActiveHostSession,
} from "@/lib/host-session-client";
import { useHostSessionContextOptional } from "@/contexts/host-session-context";

export type HostCapability =
  | { status: "loading" }
  | { status: "none" }
  | {
      status: "active";
      hostId: string;
      eventSlug: string | null;
      username: string | null;
    }
  | {
      status: "stale";
      hostId: string;
      eventSlug: string | null;
      username: string | null;
    };

type Options = {
  /** Skip fetch when unauthenticated or visitor. */
  enabled?: boolean;
};

export function useHostCapability(options?: Options) {
  const enabled = options?.enabled ?? true;
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const hostSession = useHostSessionContextOptional();
  const [link, setLink] = useState<HostLinkResponse | null>(null);
  const [linkLoading, setLinkLoading] = useState(enabled);
  const refreshEpochRef = useRef(0);

  const refreshLink = useCallback(async () => {
    if (!enabled || !isAuthenticated || !user) {
      setLink(null);
      setLinkLoading(false);
      return;
    }
    if (user.role === "VISITOR") {
      setLink(null);
      setLinkLoading(false);
      return;
    }
    setLinkLoading(true);
    const token = getAuthToken();
    const res = await getHostLinkAction(token);
    refreshEpochRef.current += 1;
    if (res.success && res.data) {
      setLink(res.data);
      if (
        res.data.hostId &&
        hostSession &&
        !hostSession.isLoading &&
        !hostSession.isActive
      ) {
        await clearStaleHostSessionIfMismatch(res.data.hostId);
      }
    } else {
      setLink(null);
    }
    setLinkLoading(false);
  }, [enabled, hostSession, isAuthenticated, user]);

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshLink(),
      hostSession?.refresh?.() ?? Promise.resolve(),
    ]);
  }, [hostSession, refreshLink]);

  useEffect(() => {
    void refreshLink();
  }, [refreshLink]);

  const sessionLoading = hostSession?.isLoading ?? false;
  const hostSessionActive = (() => {
    if (!link?.hostId) return false;
    if (hostSession) {
      return hostSession.isActive && hostSession.hostId === link.hostId;
    }
    return hasActiveHostSession(link.hostId);
  })();

  const loading = linkLoading || (hostSession != null ? sessionLoading : false);

  const capability: HostCapability = (() => {
    if (!enabled || !isAuthenticated || !user || user.role === "VISITOR") {
      return { status: "none" };
    }
    if (loading) return { status: "loading" };
    if (!link?.hasHost || !link.hostId) {
      return { status: "none" };
    }
    if (hostSessionActive) {
      return {
        status: "active",
        hostId: link.hostId,
        eventSlug: hostSession?.eventSlug ?? link.eventSlug,
        username: link.username,
      };
    }
    return {
      status: "stale",
      hostId: link.hostId,
      eventSlug: link.eventSlug,
      username: link.username,
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
    sessionLoading,
    refresh,
    getHostAuthToken: (): string | null => null,
  };
}
