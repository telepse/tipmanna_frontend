"use server";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

export type YoutubeOwnershipStatus = "verified" | "not_found";

export async function verifyYoutubeOwnershipAction(
  videoUrl: string,
  slot: 1 | 2
) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return runServerFetch<{ status: YoutubeOwnershipStatus; message?: string }>(
    `${base.replace(/\/$/, "")}/policy/verify-youtube-ownership`,
    {
      method: "POST",
      headers: await serverHostAuthHeaders(),
      body: JSON.stringify({ videoUrl, slot }),
    },
    "verifyYoutubeOwnershipAction"
  );
}
