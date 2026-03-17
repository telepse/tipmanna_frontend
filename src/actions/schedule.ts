"use server";

// -------- TV daily schedule -------- //
export async function getTVDailySchedule() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/schedule/tv-daily-schedule`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      message: data?.error?.message || "Failed to fetch TV daily schedule",
    };
  }

  return { success: true, data };
}
