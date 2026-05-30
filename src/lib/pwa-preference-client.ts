"use client";

import { getDeviceKey } from "@/lib/getAuthToken";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export async function upsertPwaPreference(
  status: string,
  opts?: { incrementPayment?: boolean }
): Promise<void> {
  const deviceKey = getDeviceKey();
  await fetch(`${apiBase()}/pwa/preference`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceKey,
      status,
      incrementPayment: opts?.incrementPayment ?? false,
    }),
  });
}
