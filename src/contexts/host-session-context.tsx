"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getHostUserFromCookies,
  type HostUserCookie,
} from "@/lib/host-session-client";
import {
  HOST_SESSION_CLEARED_EVENT,
  HOST_SESSION_TOUCHED_EVENT,
  probeHostSessionVerified,
  type HostSessionProbeStatus,
  type HostSessionTouchedDetail,
} from "@/lib/host-session-probe";

export type HostSessionContextValue = {
  status: HostSessionProbeStatus;
  isActive: boolean;
  isLoading: boolean;
  hostId: string | null;
  hostUser: HostUserCookie | null;
  eventSlug: string | null;
  username: string | null;
  eventCode: string | null;
  hostSessionExpiresAt: string | null;
  code: string | null;
  refresh: () => Promise<void>;
  applyTouched: (detail: HostSessionTouchedDetail) => void;
};

const HostSessionContext = createContext<HostSessionContextValue | null>(null);

type Props = {
  children: ReactNode;
  enabled?: boolean;
};

export function HostSessionProvider({ children, enabled = true }: Props) {
  const [status, setStatus] = useState<HostSessionProbeStatus>(
    enabled ? "loading" : "idle"
  );
  const [hostId, setHostId] = useState<string | null>(null);
  const [hostUser, setHostUser] = useState<HostUserCookie | null>(null);
  const [hostSessionExpiresAt, setHostSessionExpiresAt] = useState<string | null>(
    null
  );
  const [code, setCode] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);

  const applyActiveFromProbe = useCallback(
    (
      nextHostId: string,
      nextUser: HostUserCookie | null,
      expiresAt: string | null
    ) => {
      setHostId(nextHostId);
      setHostUser(nextUser);
      setHostSessionExpiresAt(expiresAt);
      setStatus("active");
      setCode(null);
    },
    []
  );

  const applyInactive = useCallback((nextCode?: string | null) => {
    setHostId(null);
    setHostUser(null);
    setHostSessionExpiresAt(null);
    setStatus("inactive");
    setCode(nextCode ?? "HOST_SESSION_REQUIRED");
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setStatus("idle");
      setHostId(null);
      setHostUser(null);
      setHostSessionExpiresAt(null);
      setCode(null);
      return;
    }

    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      const cookieUser = getHostUserFromCookies();
      if (!cookieUser?.id) {
        applyInactive("HOST_SESSION_REQUIRED");
        return;
      }

      setStatus(prev =>
        prev === "active" ? "active" : prev === "inactive" ? "loading" : prev
      );

      const result = await probeHostSessionVerified();

      if (result.transientFailure) {
        setCode(result.code ?? "HOST_SESSION_PROBE_FAILED");
        setStatus(prev => {
          if (prev === "active") return "active";
          return "unknown";
        });
        setHostId(prev => prev ?? cookieUser.id ?? null);
        setHostUser(prev => prev ?? cookieUser);
        setHostSessionExpiresAt(
          prev =>
            prev ?? cookieUser.hostSessionExpiresAt ?? null
        );
        return;
      }

      setCode(result.code ?? null);

      if (result.active && result.hostId) {
        applyActiveFromProbe(
          result.hostId,
          result.hostUser ?? cookieUser,
          result.hostSessionExpiresAt
        );
        return;
      }

      applyInactive(result.code);
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [applyActiveFromProbe, applyInactive, enabled]);

  const applyTouched = useCallback(
    (detail: HostSessionTouchedDetail) => {
      if (!detail.active) {
        applyInactive("HOST_SESSION_REQUIRED");
        return;
      }

      const cookieUser = getHostUserFromCookies();
      const nextId = detail.hostId ?? cookieUser?.id;
      if (!nextId) {
        void refresh();
        return;
      }

      const mergedUser: HostUserCookie =
        cookieUser?.id === nextId
          ? {
              ...cookieUser,
              hostSessionExpiresAt:
                detail.hostSessionExpiresAt ?? cookieUser.hostSessionExpiresAt,
            }
          : { id: nextId, hostSessionExpiresAt: detail.hostSessionExpiresAt };

      applyActiveFromProbe(
        nextId,
        mergedUser,
        detail.hostSessionExpiresAt ?? mergedUser.hostSessionExpiresAt ?? null
      );
    },
    [applyActiveFromProbe, applyInactive, refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onTouched = (event: Event) => {
      const detail = (event as CustomEvent<HostSessionTouchedDetail>).detail;
      if (detail) applyTouched(detail);
    };
    const onCleared = () => {
      applyInactive("HOST_SESSION_REQUIRED");
    };

    window.addEventListener(HOST_SESSION_TOUCHED_EVENT, onTouched);
    window.addEventListener(HOST_SESSION_CLEARED_EVENT, onCleared);
    return () => {
      window.removeEventListener(HOST_SESSION_TOUCHED_EVENT, onTouched);
      window.removeEventListener(HOST_SESSION_CLEARED_EVENT, onCleared);
    };
  }, [applyInactive, applyTouched]);

  const value = useMemo<HostSessionContextValue>(() => {
    const isActive = status === "active" && Boolean(hostId);
    return {
      status,
      isActive,
      isLoading: status === "loading" || status === "unknown",
      hostId: isActive ? hostId : null,
      hostUser: isActive ? hostUser : null,
      eventSlug: isActive ? (hostUser?.eventSlug ?? null) : null,
      username: isActive ? (hostUser?.username ?? null) : null,
      eventCode: isActive ? (hostUser?.eventCode ?? null) : null,
      hostSessionExpiresAt,
      code,
      refresh,
      applyTouched,
    };
  }, [
    applyTouched,
    code,
    hostId,
    hostSessionExpiresAt,
    hostUser,
    refresh,
    status,
  ]);

  return (
    <HostSessionContext.Provider value={value}>
      {children}
    </HostSessionContext.Provider>
  );
}

export function useHostSessionContext(): HostSessionContextValue {
  const ctx = useContext(HostSessionContext);
  if (!ctx) {
    throw new Error("useHostSessionContext requires HostSessionProvider");
  }
  return ctx;
}

export function useHostSessionContextOptional(): HostSessionContextValue | null {
  return useContext(HostSessionContext);
}
