"use server";

import { runServerFetch } from "@/lib/action-fetch";

// -------- TV daily schedule -------- //
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
