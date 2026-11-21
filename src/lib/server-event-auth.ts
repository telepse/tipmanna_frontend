import "server-only";

import { selectEventActorBearer } from "@/lib/event-actor-auth";
import { getToken } from "@/lib/getToken";
import { getHostToken } from "@/lib/getHostToken";
import { getServerCohostActorSession } from "@/lib/server-cohost-session";
import { HOST_AUTH_MISSING_HEADER } from "@/lib/server-auth";

export type ServerEventActorAuthOptions = {
  eventId?: string;
  /** Owner host dashboard — prefer `hostToken` over scoped cohost for the same event. */
  preferHostSession?: boolean;
};

/**
 * Auth headers for event-room mutations — HttpOnly host/cohost cookies only;
 * never returns tokens to the client.
 */
export async function serverEventActorAuthHeaders(
  options?: ServerEventActorAuthOptions
): Promise<Record<string, string>> {
  const cohost = await getServerCohostActorSession();
  const hostToken = await getHostToken();
  const primaryToken = await getToken();

  const bearer = selectEventActorBearer({
    eventId: options?.eventId,
    preferHostSession: options?.preferHostSession,
    cohost,
    hostToken,
    primaryToken,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  } else {
    headers[HOST_AUTH_MISSING_HEADER] = "1";
  }
  return headers;
}

export async function hasServerHostSession(): Promise<boolean> {
  return Boolean(await getHostToken());
}
