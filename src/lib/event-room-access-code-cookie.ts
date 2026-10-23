/** Event-scoped room access credentials for SSR (host_code / custom_code). */

export const EVENT_ROOM_ACCESS_CREDENTIAL_MAX_AGE_SEC = 60 * 60 * 24 * 7;

const EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isEventRoomCredentialEventId(eventId: string): boolean {
  return EVENT_ID_PATTERN.test(eventId.trim());
}

export function eventRoomAccessCodeCookieName(eventId: string): string {
  const id = eventId.trim();
  if (!isEventRoomCredentialEventId(id)) {
    throw new Error("Invalid event id for access credential cookie");
  }
  return `event_room_access_code_${id}`;
}

export function eventRoomAccessEmailCookieName(eventId: string): string {
  const id = eventId.trim();
  if (!isEventRoomCredentialEventId(id)) {
    throw new Error("Invalid event id for access credential cookie");
  }
  return `event_room_access_email_${id}`;
}

export type EventRoomAccessCredentialSource = {
  accessCode?: string | null;
  email?: string | null;
};

/** Merge explicit opts (client refresh) over server-read cookies for API headers. */
export function resolveEventRoomAccessCredentialsForFetch(
  opts: EventRoomAccessCredentialSource | undefined,
  fromCookies: EventRoomAccessCredentialSource
): { accessCode: string | null; email: string | null } {
  const accessCode =
    opts?.accessCode?.trim() || fromCookies.accessCode?.trim() || null;
  const email = opts?.email?.trim() || fromCookies.email?.trim() || null;
  return { accessCode, email };
}

/** Shared by room-access checks and gated event GET/channels/messages SSR fetches. */
export function applyEventRoomAccessCredentialHeaders(
  headers: Record<string, string>,
  resolved: { accessCode: string | null; email: string | null }
): void {
  if (resolved.accessCode) {
    headers["x-event-room-access-code"] = resolved.accessCode;
  }
  if (resolved.email) {
    headers["x-event-room-access-email"] = resolved.email;
  }
}

export function shouldPersistAccessCodeCookies(params: {
  accessCode?: string;
  allowed: boolean;
  accessMode?: string;
}): boolean {
  if (!params.allowed || !params.accessCode?.trim()) return false;
  return (
    params.accessMode === "host_code" || params.accessMode === "custom_code"
  );
}

/** Full navigation so SSR reads HttpOnly credentials (not router.refresh). */
export function reloadRoomPageAfterAccessGrant(): void {
  if (typeof window === "undefined") return;
  const url = `${window.location.pathname}${window.location.search}`;
  window.location.assign(url);
}
