"use server";

import { runServerFetch } from "@/lib/action-fetch";

/**
 * Legacy TV daily schedule action — no current frontend callers.
 * Backend route preserved for unknown deployed clients; prefer fetchTvScheduleAction.
 */
export async function getTVDailySchedule() {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/schedule/tv-daily-schedule`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
    "getTVDailySchedule"
  );
}
