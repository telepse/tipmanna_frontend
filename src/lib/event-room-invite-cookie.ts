export function eventRoomInviteCookieName(eventId: string): string {
  return `event_room_invite_${encodeURIComponent(eventId.trim())}`;
}

/** Client helper — persist invite token for SSR + API headers. */
export function persistEventRoomInviteToken(
  eventId: string,
  token: string
): void {
  if (typeof document === "undefined") return;
  const name = eventRoomInviteCookieName(eventId);
  const maxAge = 60 * 60 * 24 * 90;
  document.cookie = `${name}=${encodeURIComponent(token.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
