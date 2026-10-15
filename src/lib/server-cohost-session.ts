import "server-only";

import { cookies } from "next/headers";

import { getCohostToken } from "@/lib/getCohostToken";
import type { EventActorCohostSession } from "@/lib/event-actor-auth";

/** Active cohost secondary session (HttpOnly token + scoped event marker). */
export async function getServerCohostActorSession(): Promise<EventActorCohostSession | null> {
  const token = await getCohostToken();
  if (!token) return null;

  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("cohostUser")?.value;
    if (!raw) {
      return { token, eventId: null, active: true };
    }
    const cohostUser = JSON.parse(raw) as {
      eventId?: string;
      cohostSessionExpiresAt?: string;
    };
    const expiresAt = cohostUser.cohostSessionExpiresAt;
    const active = !expiresAt || new Date(expiresAt).getTime() > Date.now();
    return {
      token,
      eventId: cohostUser.eventId?.trim() ?? null,
      active,
    };
  } catch {
    return { token, eventId: null, active: false };
  }
}
