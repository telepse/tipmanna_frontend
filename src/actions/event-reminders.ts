"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

const api = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export async function setEventReminderAction(
  eventId: string,
  body: Record<string, unknown>,
  token?: string | null
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return runServerFetch<{ entryId: string; offsetMinutes: number }>(
    `${api()}/events/${encodeURIComponent(eventId)}/reminders`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "setEventReminderAction"
  );
}

export async function getMyEventReminderAction(
  eventId: string,
  email?: string
) {
  const q = email?.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
  return runServerFetch<{
    hasReminder: boolean;
    entry: { id: string; offsetMinutes: number; remindAt: string } | null;
    offsetOptions: number[];
  }>(
    `${api()}/events/${encodeURIComponent(eventId)}/reminders/me${q}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "getMyEventReminderAction"
  );
}

export async function mergeSubscriberEventRemindersAction(
  body: { email: string },
  token?: string | null
) {
  return runServerFetch<{ merged: number }>(
    `${api()}/events/reminders/merge-subscriber`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "mergeSubscriberEventRemindersAction"
  );
}
