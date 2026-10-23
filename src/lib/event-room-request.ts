import "server-only";

import { getToken } from "@/lib/getToken";
import { getEventRoomInviteToken } from "@/lib/event-room-invite-cookie.server";
import {
  applyEventRoomAccessCredentialHeaders,
  resolveEventRoomAccessCredentialsForFetch,
} from "@/lib/event-room-access-code-cookie";
import { getEventRoomAccessCredentialsFromCookies } from "@/lib/event-room-access-code-cookie.server";

/** Auth + invite + access credentials for event-room API reads (SSR and server actions). */
export async function buildEventRoomRequestHeaders(
  eventId: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const inviteToken = await getEventRoomInviteToken(eventId);
  if (inviteToken) headers["x-event-room-invite-token"] = inviteToken;
  const fromCookies = await getEventRoomAccessCredentialsFromCookies(eventId);
  const resolved = resolveEventRoomAccessCredentialsForFetch(
    undefined,
    fromCookies
  );
  applyEventRoomAccessCredentialHeaders(headers, resolved);
  return headers;
}
