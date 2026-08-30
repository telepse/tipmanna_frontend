"use client";

import { useHostCapability } from "@/hooks/use-host-capability";
import { useHostSessionContextOptional } from "@/contexts/host-session-context";
import {
  getHostUserFromCookies,
  hasActiveHostSession,
} from "@/lib/host-session-client";

/** Active host id from verified session when available. */
export function useHostID(): string | null {
  const hostSession = useHostSessionContextOptional();
  const { capability, hostSessionActive } = useHostCapability();

  if (hostSession?.isActive && hostSession.hostId) {
    return hostSession.hostId;
  }

  if (hostSessionActive && capability.status === "active") {
    return capability.hostId;
  }

  const hostUser = getHostUserFromCookies();
  if (hostUser?.id && hasActiveHostSession(hostUser.id)) {
    return hostUser.id;
  }

  return null;
}
