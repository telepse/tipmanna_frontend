"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { getHostLinkAction, type HostLinkResponse } from "@/actions/auth";
import { getAuthToken } from "@/lib/getAuthToken";
import { detectEmailVerificationRequired } from "@/lib/detect-email-verification-required";
import {
  clearStaleHostSessionIfMismatch,
  hasActiveHostSession,
} from "@/lib/host-session-client";
import { useHostSessionContextOptional } from "@/contexts/host-session-context";
import { isHostLinkResolutionPending } from "@/lib/host-link-resolution";

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
  const authToken = useSelector((s: RootState) => s.auth.token);
  const hostSession = useHostSessionContextOptional();
  const [link, setLink] = useState<HostLinkResponse | null>(null);
  const [linkLoading, setLinkLoading] = useState(enabled);
  const canWriteRef = useRef(false);
  const prevFetchKeyRef = useRef<string | null>(null);
  const linkRef = useRef<HostLinkResponse | null>(null);
  linkRef.current = link;

  const shouldFetchLink =
    enabled && isAuthenticated && Boolean(user) && user?.role !== "VISITOR";
  const fetchKey = shouldFetchLink
    ? `${user?.id ?? ""}:${user?.role ?? ""}`
    : null;

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
    if (!isAuthenticated || !user || user.role === "VISITOR") {
      setLink(null);
      setLinkLoading(false);
      return;
    }
    if (!enabled) {
      setLinkLoading(false);
      return;
    }
    if (!canWriteRef.current) {
      setLinkLoading(true);
    }
    const token = authToken?.trim() || getAuthToken();
    const res = await getHostLinkAction(token);
    if (res.success && res.data) {
      setLink(res.data);
    } else {
      if (
        detectEmailVerificationRequired(res, {
          accountType: "HOST",
        })
      ) {
        setLinkLoading(false);
        return;
      }
      setLink(null);
    }
    setLinkLoading(false);
  }, [authToken, enabled, isAuthenticated, user?.id, user?.role]);

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshLink(),
      hostSession?.refresh?.() ?? Promise.resolve(),
    ]);
  }, [hostSession?.refresh, refreshLink]);

  useEffect(() => {
    if (!shouldFetchLink) {
      if (!isAuthenticated || !user || user.role === "VISITOR") {
        setLink(null);
        prevFetchKeyRef.current = null;
      }
      setLinkLoading(false);
      return;
    }

    const keyChanged = fetchKey !== prevFetchKeyRef.current;
    if (keyChanged) {
      prevFetchKeyRef.current = fetchKey;
      setLink(null);
      setLinkLoading(true);
      void refreshLink();
      return;
    }

    if (!linkRef.current) {
      setLinkLoading(true);
      void refreshLink();
    }
  }, [
    fetchKey,
    isAuthenticated,
    refreshLink,
    shouldFetchLink,
    user,
    user?.role,
  ]);

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

  const linkResolutionPending = isHostLinkResolutionPending({
    shouldFetchLink,
    fetchKey,
    prevFetchKey: prevFetchKeyRef.current,
    linkLoading,
  });

  const loading =
    linkResolutionPending ||
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

  const canReadAsHost = capability.status === "active";
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
