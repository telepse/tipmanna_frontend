"use client";

import type { HostUserCookie } from "@/lib/host-session-client";
import { getHostUserFromCookies } from "@/lib/host-session-client";

export type HostSessionProbeStatus =
  | "idle"
  | "loading"
  | "active"
  | "inactive"
  | "unknown";

export type HostSessionProbeResult = {
  status: HostSessionProbeStatus;
  active: boolean;
  hostId: string | null;
  hostUser: HostUserCookie | null;
  hostSessionExpiresAt: string | null;
  code?: string;
  /** True when probe failed due to network/503 — do not treat as logged out. */
  transientFailure?: boolean;
};

function mergeHostUserFromProbe(
  hostId: string | null,
  hostSessionExpiresAt: string | null
): HostUserCookie | null {
  const cookieUser = getHostUserFromCookies();
  if (!hostId) return cookieUser?.id ? cookieUser : null;

  if (cookieUser?.id === hostId) {
    return {
      ...cookieUser,
      hostSessionExpiresAt:
        hostSessionExpiresAt ?? cookieUser.hostSessionExpiresAt,
    };
  }

  return {
    id: hostId,
    hostSessionExpiresAt: hostSessionExpiresAt ?? undefined,
  };
}

/** Server-verified host session (backend touch via Next route). */
export async function probeHostSessionVerified(): Promise<HostSessionProbeResult> {
  try {
    const res = await fetch("/api/auth/host-session?verify=true", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const body = (await res.json()) as {
      active?: boolean;
      hostId?: string | null;
      hostSessionExpiresAt?: string | null;
      code?: string;
    };

    if (res.status === 503 || res.status >= 500) {
      return {
        status: "unknown",
        active: false,
        hostId: null,
        hostUser: getHostUserFromCookies(),
        hostSessionExpiresAt: null,
        code: body.code ?? "HOST_SESSION_PROBE_FAILED",
        transientFailure: true,
      };
    }

    const active = body.active === true;
    const hostId =
      (typeof body.hostId === "string" ? body.hostId : null) ??
      (active ? (getHostUserFromCookies()?.id ?? null) : null);
    const hostSessionExpiresAt = body.hostSessionExpiresAt ?? null;
    const hostUser = active
      ? mergeHostUserFromProbe(hostId, hostSessionExpiresAt)
      : null;

    return {
      status: active ? "active" : "inactive",
      active,
      hostId: active ? hostId : null,
      hostUser,
      hostSessionExpiresAt,
      code: body.code,
      transientFailure: false,
    };
  } catch {
    return {
      status: "unknown",
      active: false,
      hostId: null,
      hostUser: getHostUserFromCookies(),
      hostSessionExpiresAt: null,
      code: "HOST_SESSION_PROBE_FAILED",
      transientFailure: true,
    };
  }
}

export const HOST_SESSION_TOUCHED_EVENT = "tipmanna:host-session-touched";

export type HostSessionTouchedDetail = {
  active: boolean;
  hostSessionExpiresAt?: string;
  hostId?: string;
};

export function notifyHostSessionTouched(detail: HostSessionTouchedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<HostSessionTouchedDetail>(HOST_SESSION_TOUCHED_EVENT, {
      detail,
    })
  );
}

export const HOST_SESSION_CLEARED_EVENT = "tipmanna:host-session-cleared";

export function notifyHostSessionCleared(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HOST_SESSION_CLEARED_EVENT));
}
