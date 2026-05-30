"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

export type YoutubeOwnershipStatus = "verified" | "not_found";

export async function verifyYoutubeOwnershipAction(
  videoUrl: string,
  slot: 1 | 2,
  token?: string | null
) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch<{ status: YoutubeOwnershipStatus; message?: string }>(
    `${base.replace(/\/$/, "")}/policy/verify-youtube-ownership`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ videoUrl, slot }),
    },
    "verifyYoutubeOwnershipAction"
  );
}
