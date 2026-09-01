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
  const canWriteRef = useRef(false);

  const hostSessionActive = (() => {
    if (!link?.hostId) return false;
    if (hostSession) {
      if (hostSession.isActive && hostSession.hostId === link.hostId) {
        return true;
      }
      if (
        hostSession.status === "unknown" &&
        hasActiveHostSession(link.hostId)
      ) {
        return true;
      }
      return false;
    }
    return hasActiveHostSession(link.hostId);
  })();

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
    if (!canWriteRef.current) {
      setLinkLoading(true);
    }
    const token = getAuthToken();
    const res = await getHostLinkAction(token);
    if (res.success && res.data) {
      setLink(res.data);
    } else {
      setLink(null);
    }
    setLinkLoading(false);
  }, [enabled, isAuthenticated, user?.id, user?.role]);

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshLink(),
      hostSession?.refresh?.() ?? Promise.resolve(),
    ]);
  }, [hostSession?.refresh, refreshLink]);

  useEffect(() => {
    void refreshLink();
  }, [refreshLink]);

  useEffect(() => {
    if (
      link?.hostId &&
      hostSession &&
      !hostSession.isLoading &&
      !hostSession.isActive
    ) {
      void clearStaleHostSessionIfMismatch(link.hostId);
    }
  }, [link?.hostId, hostSession?.isActive, hostSession?.isLoading]);

  const sessionLoading = hostSession?.isLoading ?? false;

  const loading =
    (linkLoading && !(link?.hasHost && hostSessionActive)) ||
    (sessionLoading && !hostSessionActive);

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
  canWriteRef.current = canWriteAsHost;

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
