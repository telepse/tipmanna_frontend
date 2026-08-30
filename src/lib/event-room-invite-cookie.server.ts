import "server-only";

import { cookies } from "next/headers";

import { eventRoomInviteCookieName } from "@/lib/event-room-invite-cookie";

/** Server-readable invite token set when a guest accepts an event-room invite. */
export async function getEventRoomInviteToken(
  eventId: string
): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const row = cookieStore.get(eventRoomInviteCookieName(eventId));
    return row?.value?.trim() ?? null;
  } catch {
    return null;
  }
}
