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
import {
  getCachedHostLink,
  getOrFetchHostLink,
  subscribeHostLinkCache,
} from "@/lib/host-link-cache";
import {
  HOST_SESSION_CLEARED_EVENT,
  HOST_SESSION_TOUCHED_EVENT,
} from "@/lib/host-session-probe";

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

function shouldFetchHostLink(
  enabled: boolean,
  isAuthenticated: boolean,
  user: RootState["auth"]["user"]
): boolean {
  return (
    enabled && isAuthenticated && Boolean(user) && user?.role !== "VISITOR"
  );
}

export function useHostCapability(options?: Options) {
  const enabled = options?.enabled ?? true;
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const hostSession = useHostSessionContextOptional();
  const userId = user?.id ?? "";

  const shouldFetchLink = shouldFetchHostLink(enabled, isAuthenticated, user);
  const cachedOnMount =
    shouldFetchLink && userId ? getCachedHostLink(userId) : null;

  const [link, setLink] = useState<HostLinkResponse | null>(cachedOnMount);
  const [linkLoading, setLinkLoading] = useState(
    shouldFetchLink ? !cachedOnMount : false
  );
  const canWriteRef = useRef(false);
  const prevFetchKeyRef = useRef<string | null>(null);
  const linkRef = useRef<HostLinkResponse | null>(null);
  linkRef.current = link;

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
    const token = authToken?.trim() || getAuthToken();
    if (!token || !user.id) {
      setLinkLoading(false);
      return;
    }

    const cached = getCachedHostLink(user.id);
    if (cached) {
      setLink(cached);
      setLinkLoading(false);
      return;
    }

    if (!canWriteRef.current) {
      setLinkLoading(true);
    }
    const res = await getOrFetchHostLink(user.id, token);
    if (res.success && res.data) {
      setLink(res.data);
    } else {
      const direct = await getHostLinkAction(token);
      if (
        detectEmailVerificationRequired(direct, {
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
    if (!userId) return;
    return subscribeHostLinkCache(() => {
      const cached = getCachedHostLink(userId);
      if (cached) {
        setLink(cached);
        setLinkLoading(false);
      } else {
        setLink(null);
        setLinkLoading(true);
        void refreshLink();
      }
    });
  }, [refreshLink, userId]);

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
      const cached = user?.id ? getCachedHostLink(user.id) : null;
      setLink(cached);
      setLinkLoading(!cached);
      if (!cached) {
        void refreshLink();
      }
      return;
    }

    if (!linkRef.current) {
      const cached = user?.id ? getCachedHostLink(user.id) : null;
      if (cached) {
        setLink(cached);
        setLinkLoading(false);
      } else {
        setLinkLoading(true);
        void refreshLink();
      }
    }
  }, [
    fetchKey,
    isAuthenticated,
    refreshLink,
    shouldFetchLink,
    user,
    user?.role,
    user?.id,
  ]);

  useEffect(() => {
    const onSessionChange = () => {
      void refreshLink();
    };
    window.addEventListener(HOST_SESSION_TOUCHED_EVENT, onSessionChange);
    window.addEventListener(HOST_SESSION_CLEARED_EVENT, onSessionChange);
    return () => {
      window.removeEventListener(HOST_SESSION_TOUCHED_EVENT, onSessionChange);
      window.removeEventListener(HOST_SESSION_CLEARED_EVENT, onSessionChange);
    };
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
