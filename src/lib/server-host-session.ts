import "server-only";

import { cookies } from "next/headers";

export type ServerHostSession = {
  hostId: string | null;
  eventSlug: string | null;
  username: string | null;
  eventCode: string | null;
  isActive: boolean;
};

/** Server-side host session marker (hostUser cookie). */
export async function getServerHostSession(): Promise<ServerHostSession> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("hostUser")?.value;
    if (!raw) {
      return {
        hostId: null,
        eventSlug: null,
        username: null,
        eventCode: null,
        isActive: false,
      };
    }
    const hostUser = JSON.parse(raw) as {
      id?: string;
      eventSlug?: string;
      username?: string;
      eventCode?: string;
      hostSessionExpiresAt?: string;
    };
    const expiresAt = hostUser.hostSessionExpiresAt;
    const isActive =
      Boolean(hostUser.id) &&
      (!expiresAt || new Date(expiresAt).getTime() > Date.now());
    return {
      hostId: isActive ? (hostUser.id ?? null) : null,
      eventSlug: isActive ? (hostUser.eventSlug ?? null) : null,
      username: isActive ? (hostUser.username ?? null) : null,
      eventCode: isActive ? (hostUser.eventCode ?? null) : null,
      isActive,
    };
  } catch {
    return {
      hostId: null,
      eventSlug: null,
      username: null,
      eventCode: null,
      isActive: false,
    };
  }
}
