import "server-only";

import { cookies } from "next/headers";

import {
  EVENT_ROOM_ACCESS_CREDENTIAL_MAX_AGE_SEC,
  eventRoomAccessCodeCookieName,
  eventRoomAccessEmailCookieName,
  isEventRoomCredentialEventId,
  type EventRoomAccessCredentialSource,
} from "@/lib/event-room-access-code-cookie";

const cookieBase = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: EVENT_ROOM_ACCESS_CREDENTIAL_MAX_AGE_SEC,
});

export async function getEventRoomAccessCredentialsFromCookies(
  eventId: string
): Promise<EventRoomAccessCredentialSource> {
  if (!isEventRoomCredentialEventId(eventId)) {
    return { accessCode: null, email: null };
  }
  try {
    const store = await cookies();
    const codeRow = store.get(eventRoomAccessCodeCookieName(eventId));
    const emailRow = store.get(eventRoomAccessEmailCookieName(eventId));
    return {
      accessCode: codeRow?.value?.trim() ?? null,
      email: emailRow?.value?.trim() ?? null,
    };
  } catch {
    return { accessCode: null, email: null };
  }
}

/** Set credentials only after backend accepted submit (not client-trusted grant). */
export async function setEventRoomAccessCredentialCookies(
  eventId: string,
  creds: { accessCode?: string; email?: string }
): Promise<void> {
  if (!isEventRoomCredentialEventId(eventId)) return;
  const store = await cookies();
  const base = cookieBase();
  const code = creds.accessCode?.trim();
  if (code) {
    store.set(eventRoomAccessCodeCookieName(eventId), code, base);
  }
  const email = creds.email?.trim().toLowerCase();
  if (email) {
    store.set(eventRoomAccessEmailCookieName(eventId), email, base);
  }
}
