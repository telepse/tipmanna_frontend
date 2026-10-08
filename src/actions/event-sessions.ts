"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

export async function createEventSessionAction(
  eventId: string,
  title: string,
  amountToRaise: number
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/event-sessions/${eventId}/sessions`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ title, amountToRaise }),
      cache: "no-store",
    },
    "createEventSessionAction"
  );
}

export async function activateEventSessionAction(
  eventId: string,
  sessionId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/event-sessions/${eventId}/sessions/${sessionId}/activate`,
    {
      method: "PATCH",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "activateEventSessionAction"
  );
}
