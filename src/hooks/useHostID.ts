"use client";

import {
  getHostUserFromCookies,
  hasActiveHostSession,
} from "@/lib/host-session-client";
import { useHostCapability } from "@/hooks/use-host-capability";

/** Active host id from host session cookie / capability — never primary Redux. */
export function useHostID(): string | null {
  const { capability, hostSessionActive } = useHostCapability();

  if (hostSessionActive && capability.status === "active") {
    return capability.hostId;
  }

  const hostUser = getHostUserFromCookies();
  if (hostUser?.id && hasActiveHostSession(hostUser.id)) {
    return hostUser.id;
  }

  return null;
}
