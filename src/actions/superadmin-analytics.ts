"use server";

import { runServerFetch } from "@/lib/action-fetch";

export async function getSystemVideoAnalyticsAction(
  token: string,
  opts?: { from?: string; to?: string; hostId?: string }
) {
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  if (opts?.hostId) params.set("hostId", opts.hostId);
  const q = params.toString();
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/superadmin/video-analytics${q ? `?${q}` : ""}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
    "getSystemVideoAnalyticsAction"
  );
}
